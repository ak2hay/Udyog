"use server";

import { and, eq, desc, asc } from "drizzle-orm";
import {
  bomHeaders,
  bomLines,
  routings,
  routingOperations,
  productionOrders,
  jobCards,
  qcInspections,
  materialIssues,
  materialIssueLines,
  salesOrders,
  salesOrderLines,
  items,
  warehouses,
  nextDocumentNumber,
  applyStockMovement,
  auditLogs,
} from "@rkyves/db";
import { requireModuleAccess } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { todayISO } from "@/lib/utils";

async function audit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, newValue?: unknown) {
  const { getDb } = await import("@rkyves/db");
  await getDb().insert(auditLogs).values({
    tenantId,
    userId,
    action,
    entityType,
    entityId,
    newValue: newValue as object,
  });
}

export async function listBoms() {
  const { tenant, db } = await requireModuleAccess("manufacturing");
  const headers = await db.query.bomHeaders.findMany({
    where: eq(bomHeaders.tenantId, tenant.id),
    orderBy: [desc(bomHeaders.createdAt)],
  });
  const allItems = await db.query.items.findMany({ where: eq(items.tenantId, tenant.id) });
  const itemMap = Object.fromEntries(allItems.map((i) => [i.id, i]));
  return headers.map((h) => ({ ...h, item: itemMap[h.itemId] }));
}

export async function getBom(bomId: string) {
  const { tenant, db } = await requireModuleAccess("manufacturing");
  const header = await db.query.bomHeaders.findFirst({
    where: and(eq(bomHeaders.id, bomId), eq(bomHeaders.tenantId, tenant.id)),
  });
  if (!header) return null;
  const lines = await db.query.bomLines.findMany({
    where: eq(bomLines.bomId, bomId),
    orderBy: [asc(bomLines.sequence)],
  });
  const allItems = await db.query.items.findMany({ where: eq(items.tenantId, tenant.id) });
  const itemMap = Object.fromEntries(allItems.map((i) => [i.id, i]));
  return {
    ...header,
    item: itemMap[header.itemId],
    lines: lines.map((l) => ({ ...l, component: itemMap[l.componentItemId] })),
  };
}

export async function createBom(formData: FormData) {
  const { tenant, session, db } = await requireModuleAccess("manufacturing");
  const itemId = String(formData.get("itemId"));
  const revision = String(formData.get("revision") || "A").trim() || "A";
  const quantity = String(formData.get("quantity") || "1");
  const scrapPercent = String(formData.get("scrapPercent") || "0");
  const notes = String(formData.get("notes") || "") || null;

  const componentIds = formData.getAll("componentItemId").map(String);
  const componentQtys = formData.getAll("componentQty").map(String);
  const componentUoms = formData.getAll("componentUom").map(String);
  const componentScraps = formData.getAll("componentScrap").map(String);

  if (!itemId) throw new Error("Finished good required");
  if (componentIds.length === 0) throw new Error("Add at least one component");

  const [header] = await db
    .insert(bomHeaders)
    .values({
      tenantId: tenant.id,
      itemId,
      revision,
      quantity,
      scrapPercent,
      status: "active",
      notes,
    })
    .returning();

  for (let i = 0; i < componentIds.length; i++) {
    if (!componentIds[i]) continue;
    await db.insert(bomLines).values({
      tenantId: tenant.id,
      bomId: header.id,
      componentItemId: componentIds[i],
      quantity: componentQtys[i] || "1",
      uom: componentUoms[i] || "PCS",
      scrapPercent: componentScraps[i] || "0",
      sequence: i + 1,
    });
  }

  await audit(tenant.id, session.user.id, "create", "bom", header.id, header);
  revalidatePath("/manufacturing/bom");
}

export async function listAllItemsForBom() {
  const { tenant, db } = await requireModuleAccess("manufacturing");
  return db.query.items.findMany({
    where: eq(items.tenantId, tenant.id),
    orderBy: [desc(items.createdAt)],
  });
}

export async function createProductionOrder(formData: FormData) {
  const { tenant, session, db } = await requireModuleAccess("manufacturing");
  const salesOrderId = String(formData.get("salesOrderId") || "") || null;
  const itemId = String(formData.get("itemId"));
  const quantity = String(formData.get("quantity") || "1");
  const warehouseId = String(formData.get("warehouseId") || "") || null;

  const bom = await db.query.bomHeaders.findFirst({
    where: and(eq(bomHeaders.itemId, itemId), eq(bomHeaders.tenantId, tenant.id), eq(bomHeaders.status, "active")),
  });
  const routing = await db.query.routings.findFirst({
    where: and(eq(routings.itemId, itemId), eq(routings.tenantId, tenant.id), eq(routings.status, "active")),
  });

  const number = await nextDocumentNumber(db, tenant.id, "productionOrder");
  const [mo] = await db
    .insert(productionOrders)
    .values({
      tenantId: tenant.id,
      number,
      salesOrderId,
      itemId,
      bomId: bom?.id,
      routingId: routing?.id,
      warehouseId,
      quantity,
      status: "confirmed",
      plannedStart: todayISO(),
      createdBy: session.user.id,
    })
    .returning();

  if (routing) {
    const ops = await db.query.routingOperations.findMany({
      where: eq(routingOperations.routingId, routing.id),
    });
    for (const op of ops) {
      const jcNumber = await nextDocumentNumber(db, tenant.id, "jobCard");
      await db.insert(jobCards).values({
        tenantId: tenant.id,
        number: jcNumber,
        productionOrderId: mo.id,
        routingOperationId: op.id,
        operationName: op.operationName,
        sequence: op.sequence,
        workCenterId: op.workCenterId,
        requiredQuantity: quantity,
        status: "pending",
      });
    }
  }

  await audit(tenant.id, session.user.id, "create", "production_order", mo.id, mo);
  revalidatePath("/manufacturing/orders");
  revalidatePath("/manufacturing/job-cards");
  return mo.id;
}

export async function issueMaterialsForProduction(productionOrderId: string) {
  const { tenant, session, db } = await requireModuleAccess("manufacturing");
  const mo = await db.query.productionOrders.findFirst({
    where: and(eq(productionOrders.id, productionOrderId), eq(productionOrders.tenantId, tenant.id)),
  });
  if (!mo?.bomId || !mo.warehouseId) throw new Error("Production order missing BOM or warehouse");
  const lines = await db.query.bomLines.findMany({ where: eq(bomLines.bomId, mo.bomId) });
  const number = await nextDocumentNumber(db, tenant.id, "materialIssue");
  const [issue] = await db
    .insert(materialIssues)
    .values({
      tenantId: tenant.id,
      number,
      productionOrderId,
      warehouseId: mo.warehouseId,
      status: "posted",
      issueDate: todayISO(),
      createdBy: session.user.id,
    })
    .returning();

  for (const line of lines) {
    const qty = Number(line.quantity) * Number(mo.quantity) * (1 + Number(line.scrapPercent || 0) / 100);
    await db.insert(materialIssueLines).values({
      tenantId: tenant.id,
      materialIssueId: issue.id,
      itemId: line.componentItemId,
      quantity: String(qty),
      uom: line.uom,
    });
    await applyStockMovement(db, {
      tenantId: tenant.id,
      warehouseId: mo.warehouseId,
      itemId: line.componentItemId,
      quantity: -qty,
      movementType: "out",
      referenceType: "material_issue",
      referenceId: issue.id,
      referenceNumber: number,
      createdBy: session.user.id,
    });
  }

  await db
    .update(productionOrders)
    .set({ status: "in_progress", wipQuantity: mo.quantity, updatedAt: new Date() })
    .where(eq(productionOrders.id, productionOrderId));
  await audit(tenant.id, session.user.id, "issue", "material_issue", issue.id, issue);
  revalidatePath("/manufacturing/orders");
  revalidatePath("/inventory/stock");
}

export async function startJobCard(jobCardId: string, operatorName: string) {
  const { tenant, db } = await requireModuleAccess("manufacturing");
  await db
    .update(jobCards)
    .set({
      status: "in_progress",
      operatorName,
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(jobCards.id, jobCardId), eq(jobCards.tenantId, tenant.id)));
  revalidatePath("/manufacturing/job-cards");
}

export async function completeJobCard(formData: FormData) {
  const { tenant, session, db } = await requireModuleAccess("manufacturing");
  const jobCardId = String(formData.get("jobCardId"));
  const completedQuantity = String(formData.get("completedQuantity") || "0");
  const scrapQuantity = String(formData.get("scrapQuantity") || "0");
  const remarks = String(formData.get("remarks") || "") || null;

  const jc = await db.query.jobCards.findFirst({
    where: and(eq(jobCards.id, jobCardId), eq(jobCards.tenantId, tenant.id)),
  });
  if (!jc) throw new Error("Job card not found");

  await db
    .update(jobCards)
    .set({
      status: "completed",
      completedQuantity,
      scrapQuantity,
      remarks,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(jobCards.id, jobCardId));

  const siblings = await db.query.jobCards.findMany({
    where: eq(jobCards.productionOrderId, jc.productionOrderId),
  });
  const allDone = siblings.every((s) => (s.id === jobCardId ? true : s.status === "completed"));
  if (allDone) {
    const mo = await db.query.productionOrders.findFirst({
      where: eq(productionOrders.id, jc.productionOrderId),
    });
    if (mo) {
      const qcNumber = await nextDocumentNumber(db, tenant.id, "qc");
      await db.insert(qcInspections).values({
        tenantId: tenant.id,
        number: qcNumber,
        stage: "final",
        productionOrderId: mo.id,
        jobCardId,
        itemId: mo.itemId,
        warehouseId: mo.warehouseId,
        inspectedQuantity: completedQuantity,
        status: "pending",
        createdBy: session.user.id,
      });
      await db
        .update(productionOrders)
        .set({ status: "completed", completedQuantity, scrapQuantity, updatedAt: new Date() })
        .where(eq(productionOrders.id, mo.id));
    }
  }

  revalidatePath("/manufacturing/job-cards");
  revalidatePath("/quality/inspections");
  revalidatePath("/manufacturing/orders");
}

export async function postQcResult(formData: FormData) {
  const { tenant, session, db } = await requireModuleAccess("quality");
  const qcId = String(formData.get("qcId"));
  const passedQuantity = String(formData.get("passedQuantity") || "0");
  const rejectedQuantity = String(formData.get("rejectedQuantity") || "0");
  const inspectorName = String(formData.get("inspectorName") || "") || null;
  const notes = String(formData.get("notes") || "") || null;

  const qc = await db.query.qcInspections.findFirst({
    where: and(eq(qcInspections.id, qcId), eq(qcInspections.tenantId, tenant.id)),
  });
  if (!qc) throw new Error("QC not found");

  const passed = Number(passedQuantity);
  const rejected = Number(rejectedQuantity);
  const result = rejected === 0 ? "pass" : passed === 0 ? "fail" : "partial";

  await db
    .update(qcInspections)
    .set({
      passedQuantity,
      rejectedQuantity,
      result,
      status: "posted",
      inspectorName,
      notes,
      inspectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(qcInspections.id, qcId));

  if (passed > 0 && qc.warehouseId) {
    await applyStockMovement(db, {
      tenantId: tenant.id,
      warehouseId: qc.warehouseId,
      itemId: qc.itemId,
      quantity: passed,
      movementType: "in",
      referenceType: "qc",
      referenceId: qc.id,
      referenceNumber: qc.number,
      notes: "Finished goods from QC pass",
      createdBy: session.user.id,
    });
  }

  if (qc.productionOrderId) {
    await db
      .update(productionOrders)
      .set({
        status: "posted",
        completedQuantity: passedQuantity,
        scrapQuantity: rejectedQuantity,
        wipQuantity: "0",
        updatedAt: new Date(),
      })
      .where(eq(productionOrders.id, qc.productionOrderId));
  }

  await audit(tenant.id, session.user.id, "post", "qc", qcId, { result, passedQuantity, rejectedQuantity });
  revalidatePath("/quality/inspections");
  revalidatePath("/inventory/stock");
}

export async function listProductionOrders() {
  const { tenant, db } = await requireModuleAccess("manufacturing");
  return db.query.productionOrders.findMany({
    where: eq(productionOrders.tenantId, tenant.id),
    orderBy: [desc(productionOrders.createdAt)],
  });
}

export async function listJobCards() {
  const { tenant, db } = await requireModuleAccess("manufacturing");
  return db.query.jobCards.findMany({
    where: eq(jobCards.tenantId, tenant.id),
    orderBy: [desc(jobCards.createdAt)],
  });
}

export async function listQcInspections() {
  const { tenant, db } = await requireModuleAccess("quality");
  return db.query.qcInspections.findMany({
    where: eq(qcInspections.tenantId, tenant.id),
    orderBy: [desc(qcInspections.createdAt)],
  });
}

export async function listSalesOrdersForMfg() {
  const { tenant, db } = await requireModuleAccess("manufacturing");
  return db.query.salesOrders.findMany({
    where: and(eq(salesOrders.tenantId, tenant.id)),
    orderBy: [desc(salesOrders.createdAt)],
  });
}

export async function listSalesOrderLines(salesOrderId: string) {
  const { tenant, db } = await requireModuleAccess("manufacturing");
  return db.query.salesOrderLines.findMany({
    where: and(eq(salesOrderLines.salesOrderId, salesOrderId), eq(salesOrderLines.tenantId, tenant.id)),
  });
}

export async function listWarehousesForMfg() {
  const { tenant, db } = await requireModuleAccess("manufacturing");
  return db.query.warehouses.findMany({ where: eq(warehouses.tenantId, tenant.id) });
}

export async function listFinishedGoods() {
  const { tenant, db } = await requireModuleAccess("manufacturing");
  return db.query.items.findMany({
    where: and(eq(items.tenantId, tenant.id), eq(items.itemType, "finished_good")),
  });
}
