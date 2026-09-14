"use server";

import { and, desc, eq } from "drizzle-orm";
import {
  getDb,
  nextDocumentNumber,
  tallyExportBatches,
  tallyExportItems,
  gatherExportPayload,
  loadPreviouslyExportedIds,
  countsFromPayload,
  validateExportPayload,
  listExportItemRows,
  DEFAULT_INCLUDES,
  type TallyExportIncludes,
  type ExportCounts,
  type ValidationResult,
} from "@rkyves/db";
import { requireModuleAccess } from "@/lib/session";
import { revalidatePath } from "next/cache";

export type TallyPreviewResult = {
  fromDate: string;
  toDate: string;
  mode: "range" | "since_last";
  includes: TallyExportIncludes;
  counts: ExportCounts;
  validation: ValidationResult;
  lastExportAt: string | null;
};

function parseIncludes(formData: FormData): TallyExportIncludes {
  return {
    masters: formData.get("includeMasters") === "on" || formData.get("includeMasters") === "true",
    sales: formData.get("includeSales") === "on" || formData.get("includeSales") === "true",
    purchase: formData.get("includePurchase") === "on" || formData.get("includePurchase") === "true",
    receipts: formData.get("includeReceipts") === "on" || formData.get("includeReceipts") === "true",
    payments: formData.get("includePayments") === "on" || formData.get("includePayments") === "true",
    expenses: formData.get("includeExpenses") === "on" || formData.get("includeExpenses") === "true",
  };
}

function parseIncludesFromObject(raw: Partial<TallyExportIncludes> | null | undefined): TallyExportIncludes {
  return { ...DEFAULT_INCLUDES, ...raw };
}

async function resolveDateRange(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  mode: "range" | "since_last",
  fromDate: string,
  toDate: string,
): Promise<{ fromDate: string; toDate: string; lastExportAt: string | null }> {
  const last = await db.query.tallyExportBatches.findFirst({
    where: and(
      eq(tallyExportBatches.tenantId, tenantId),
      eq(tallyExportBatches.status, "exported"),
    ),
    orderBy: [desc(tallyExportBatches.exportedAt)],
  });

  const lastExportAt = last?.exportedAt?.toISOString() ?? null;

  if (mode === "since_last") {
    if (last?.toDate) {
      // Start the day after last export's toDate, or use last export date
      const d = new Date(last.toDate + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 1);
      const nextFrom = d.toISOString().slice(0, 10);
      return {
        fromDate: nextFrom <= toDate ? nextFrom : toDate,
        toDate,
        lastExportAt,
      };
    }
    // No prior export — use a wide default (start of FY-ish: Apr 1 current/previous)
    const now = new Date();
    const year = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    return { fromDate: `${year}-04-01`, toDate, lastExportAt };
  }

  return { fromDate, toDate, lastExportAt };
}

export async function getLastTallyExport() {
  const { tenant, db } = await requireModuleAccess("finance");
  return db.query.tallyExportBatches.findFirst({
    where: and(
      eq(tallyExportBatches.tenantId, tenant.id),
      eq(tallyExportBatches.status, "exported"),
    ),
    orderBy: [desc(tallyExportBatches.exportedAt)],
  });
}

export async function listTallyExportBatches() {
  const { tenant, db } = await requireModuleAccess("finance");
  return db.query.tallyExportBatches.findMany({
    where: eq(tallyExportBatches.tenantId, tenant.id),
    orderBy: [desc(tallyExportBatches.createdAt)],
    limit: 50,
  });
}

export async function previewTallyExport(input: {
  fromDate: string;
  toDate: string;
  mode: "range" | "since_last";
  includes?: Partial<TallyExportIncludes>;
  reexport?: boolean;
}): Promise<TallyPreviewResult> {
  const { tenant, db } = await requireModuleAccess("finance");
  const includes = parseIncludesFromObject(input.includes);
  const { fromDate, toDate, lastExportAt } = await resolveDateRange(
    db,
    tenant.id,
    input.mode,
    input.fromDate,
    input.toDate,
  );

  const previouslyExportedIds = input.reexport
    ? undefined
    : await loadPreviouslyExportedIds(db, tenant.id);

  const payload = await gatherExportPayload(db, {
    tenantId: tenant.id,
    fromDate,
    toDate,
    includes,
    reexport: input.reexport ?? false,
    previouslyExportedIds,
  });

  return {
    fromDate,
    toDate,
    mode: input.mode,
    includes,
    counts: countsFromPayload(payload),
    validation: validateExportPayload(payload),
    lastExportAt,
  };
}

/** Form action: preview via redirect query is awkward — use client fetch to this via server action return */
export async function previewTallyExportAction(formData: FormData): Promise<TallyPreviewResult> {
  const mode = (String(formData.get("mode") || "range") as "range" | "since_last");
  const today = new Date().toISOString().slice(0, 10);
  return previewTallyExport({
    fromDate: String(formData.get("fromDate") || today),
    toDate: String(formData.get("toDate") || today),
    mode,
    includes: parseIncludes(formData),
    reexport: formData.get("reexport") === "on" || formData.get("reexport") === "true",
  });
}

export async function createTallyExport(input: {
  fromDate: string;
  toDate: string;
  mode: "range" | "since_last";
  includes?: Partial<TallyExportIncludes>;
  reexport?: boolean;
}): Promise<{ batchId: string; batchNumber: string; counts: ExportCounts; validation: ValidationResult }> {
  const { tenant, session, db } = await requireModuleAccess("finance");
  const includes = parseIncludesFromObject(input.includes);
  const { fromDate, toDate } = await resolveDateRange(
    db,
    tenant.id,
    input.mode,
    input.fromDate,
    input.toDate,
  );

  const previouslyExportedIds = input.reexport
    ? undefined
    : await loadPreviouslyExportedIds(db, tenant.id);

  const payload = await gatherExportPayload(db, {
    tenantId: tenant.id,
    fromDate,
    toDate,
    includes,
    reexport: input.reexport ?? false,
    previouslyExportedIds,
  });

  const validation = validateExportPayload(payload);
  if (validation.errors.length > 0) {
    throw new Error(validation.errors.join(" "));
  }

  const counts = countsFromPayload(payload);
  const batchNumber = await nextDocumentNumber(db, tenant.id, "tallyExport");

  const [batch] = await db
    .insert(tallyExportBatches)
    .values({
      tenantId: tenant.id,
      batchNumber,
      fromDate,
      toDate,
      mode: input.mode,
      status: "exported",
      includes,
      counts,
      warnings: validation.warnings,
      errors: validation.errors,
      reexport: input.reexport ? "true" : "false",
      createdBy: session.user.id,
      exportedAt: new Date(),
    })
    .returning();

  const itemRows = listExportItemRows(payload);
  if (itemRows.length > 0) {
    await db.insert(tallyExportItems).values(
      itemRows.map((row) => ({
        tenantId: tenant.id,
        batchId: batch.id,
        entityType: row.entityType,
        entityId: row.entityId,
        externalKey: row.externalKey,
        status: "included" as const,
      })),
    );
  }

  revalidatePath("/finance/tally-export");
  return {
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    counts,
    validation,
  };
}

export async function createTallyExportAction(formData: FormData) {
  const mode = (String(formData.get("mode") || "range") as "range" | "since_last");
  const today = new Date().toISOString().slice(0, 10);
  const result = await createTallyExport({
    fromDate: String(formData.get("fromDate") || today),
    toDate: String(formData.get("toDate") || today),
    mode,
    includes: parseIncludes(formData),
    reexport: formData.get("reexport") === "on" || formData.get("reexport") === "true",
  });
  return result;
}
