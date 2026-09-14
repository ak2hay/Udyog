import { and, eq } from "drizzle-orm";
import {
  tallyExportBatches,
  gatherExportPayload,
  buildExportZip,
  type TallyExportIncludes,
  DEFAULT_INCLUDES,
} from "@rkyves/db";
import { requireModuleAccess } from "@/lib/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await context.params;
  const { tenant, db } = await requireModuleAccess("finance");

  const batch = await db.query.tallyExportBatches.findFirst({
    where: and(eq(tallyExportBatches.id, batchId), eq(tallyExportBatches.tenantId, tenant.id)),
  });

  if (!batch) {
    return new Response("Export batch not found", { status: 404 });
  }

  const includes = { ...DEFAULT_INCLUDES, ...(batch.includes || {}) } as TallyExportIncludes;

  const payload = await gatherExportPayload(db, {
    tenantId: tenant.id,
    fromDate: batch.fromDate,
    toDate: batch.toDate,
    includes,
    reexport: true,
  });

  const zip = buildExportZip(payload);
  const filename = `tally-export-${batch.batchNumber}.zip`;

  return new Response(Buffer.from(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
