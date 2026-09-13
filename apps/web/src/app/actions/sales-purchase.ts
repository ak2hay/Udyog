"use server";

import { eq, desc, and } from "drizzle-orm";
import {
  quotations,
  quotationLines,
  salesOrders,
  salesOrderLines,
  purchaseOrders,
  purchaseOrderLines,
  grns,
  grnLines,
  enquiries,
  enquiryLines,
  purchaseRequests,
  purchaseRequestLines,
  auditLogs,
  nextDocumentNumber,
  applyStockMovement,
  customers,
  items,
  suppliers,
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

export async function createQuotation(formData: FormData) {
  const { tenant, session, db } = await requireModuleAccess("sales");
  const customerId = String(formData.get("customerId"));
  const itemId = String(formData.get("itemId"));
  const qty = String(formData.get("quantity") || "1");
  const unitPrice = String(formData.get("unitPrice") || "0");
  const gstRate = String(formData.get("gstRate") || "18");
  const item = await db.query.items.findFirst({ where: and(eq(items.id, itemId), eq(items.tenantId, tenant.id)) });
  if (!item) throw new Error("Item not found");
  const lineTotal = (Number(qty) * Number(unitPrice) * (1 + Number(gstRate) / 100)).toFixed(2);
  const subtotal = (Number(qty) * Number(unitPrice)).toFixed(2);
  const taxAmount = (Number(subtotal) * Number(gstRate) / 100).toFixed(2);
  const number = await nextDocumentNumber(db, tenant.id, "quotation");
  const [quote] = await db
    .insert(quotations)
    .values({
      tenantId: tenant.id,
      number,
      customerId,
      status: "draft",
      quoteDate: todayISO(),
      subtotal,
      taxAmount,
      totalAmount: lineTotal,
      createdBy: session.user.id,
    })
    .returning();
  await db.insert(quotationLines).values({
    tenantId: tenant.id,
    quotationId: quote.id,
    itemId,
    description: item.name,
    quantity: qty,
    uom: item.uom,
    unitPrice,
    gstRate,
    lineTotal,
    sequence: 1,
  });
  await audit(tenant.id, session.user.id, "create", "quotation", quote.id, quote);
  revalidatePath("/sales/quotations");
}

export async function confirmQuotation(quotationId: string) {
  const { tenant, session, db } = await requireModuleAccess("sales");
  await db
    .update(quotations)
    .set({ status: "confirmed", updatedAt: new Date() })
    .where(and(eq(quotations.id, quotationId), eq(quotations.tenantId, tenant.id)));
  await audit(tenant.id, session.user.id, "confirm", "quotation", quotationId);
  revalidatePath("/sales/quotations");
}

export async function createSalesOrderFromQuotation(quotationId: string) {
  const { tenant, session, db } = await requireModuleAccess("sales");
  const quote = await db.query.quotations.findFirst({
    where: and(eq(quotations.id, quotationId), eq(quotations.tenantId, tenant.id)),
  });
  if (!quote) throw new Error("Quotation not found");
  const lines = await db.query.quotationLines.findMany({
    where: eq(quotationLines.quotationId, quotationId),
  });
  const number = await nextDocumentNumber(db, tenant.id, "salesOrder");
  const [so] = await db
    .insert(salesOrders)
    .values({
      tenantId: tenant.id,
      number,
      quotationId,
      customerId: quote.customerId,
      status: "confirmed",
      orderDate: todayISO(),
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      totalAmount: quote.totalAmount,
      createdBy: session.user.id,
    })
    .returning();
  for (const line of lines) {
    await db.insert(salesOrderLines).values({
      tenantId: tenant.id,
      salesOrderId: so.id,
      itemId: line.itemId,
      description: line.description,
      quantity: line.quantity,
      uom: line.uom,
      unitPrice: line.unitPrice,
      gstRate: line.gstRate,
      lineTotal: line.lineTotal,
      sequence: line.sequence ?? 1,
    });
  }
  await db.update(quotations).set({ status: "posted", updatedAt: new Date() }).where(eq(quotations.id, quotationId));
  await audit(tenant.id, session.user.id, "create", "sales_order", so.id, so);
  revalidatePath("/sales/orders");
  revalidatePath("/sales/quotations");
  return so.id;
}

export async function createSalesOrder(formData: FormData) {
  const { tenant, session, db } = await requireModuleAccess("sales");
  const customerId = String(formData.get("customerId"));
  const itemId = String(formData.get("itemId"));
  const qty = String(formData.get("quantity") || "1");
  const unitPrice = String(formData.get("unitPrice") || "0");
  const gstRate = String(formData.get("gstRate") || "18");
  const item = await db.query.items.findFirst({ where: and(eq(items.id, itemId), eq(items.tenantId, tenant.id)) });
  if (!item) throw new Error("Item not found");
  const subtotal = (Number(qty) * Number(unitPrice)).toFixed(2);
  const taxAmount = ((Number(subtotal) * Number(gstRate)) / 100).toFixed(2);
  const totalAmount = (Number(subtotal) + Number(taxAmount)).toFixed(2);
  const number = await nextDocumentNumber(db, tenant.id, "salesOrder");
  const [so] = await db
    .insert(salesOrders)
    .values({
      tenantId: tenant.id,
      number,
      customerId,
      status: "confirmed",
      orderDate: todayISO(),
      subtotal,
      taxAmount,
      totalAmount,
      createdBy: session.user.id,
    })
    .returning();
  await db.insert(salesOrderLines).values({
    tenantId: tenant.id,
    salesOrderId: so.id,
    itemId,
    description: item.name,
    quantity: qty,
    uom: item.uom,
    unitPrice,
    gstRate,
    hsn: item.hsn,
    lineTotal: totalAmount,
    sequence: 1,
  });
  await audit(tenant.id, session.user.id, "create", "sales_order", so.id, so);
  revalidatePath("/sales/orders");
}

export async function createPurchaseOrder(formData: FormData) {
  const { tenant, session, db } = await requireModuleAccess("purchase");
  const supplierId = String(formData.get("supplierId"));
  const itemId = String(formData.get("itemId"));
  const qty = String(formData.get("quantity") || "1");
  const unitPrice = String(formData.get("unitPrice") || "0");
  const gstRate = String(formData.get("gstRate") || "18");
  const item = await db.query.items.findFirst({ where: and(eq(items.id, itemId), eq(items.tenantId, tenant.id)) });
  if (!item) throw new Error("Item not found");
  const subtotal = (Number(qty) * Number(unitPrice)).toFixed(2);
  const taxAmount = ((Number(subtotal) * Number(gstRate)) / 100).toFixed(2);
  const totalAmount = (Number(subtotal) + Number(taxAmount)).toFixed(2);
  const number = await nextDocumentNumber(db, tenant.id, "purchaseOrder");
  const [po] = await db
    .insert(purchaseOrders)
    .values({
      tenantId: tenant.id,
      number,
      supplierId,
      status: "confirmed",
      orderDate: todayISO(),
      subtotal,
      taxAmount,
      totalAmount,
      createdBy: session.user.id,
    })
    .returning();
  await db.insert(purchaseOrderLines).values({
    tenantId: tenant.id,
    purchaseOrderId: po.id,
    itemId,
    description: item.name,
    quantity: qty,
    uom: item.uom,
    unitPrice,
    gstRate,
    hsn: item.hsn,
    lineTotal: totalAmount,
    sequence: 1,
  });
  await audit(tenant.id, session.user.id, "create", "purchase_order", po.id, po);
  revalidatePath("/purchase/orders");
}

export async function createGrn(formData: FormData) {
  const { tenant, session, db } = await requireModuleAccess("purchase");
  const purchaseOrderId = String(formData.get("purchaseOrderId"));
  const warehouseId = String(formData.get("warehouseId"));
  const po = await db.query.purchaseOrders.findFirst({
    where: and(eq(purchaseOrders.id, purchaseOrderId), eq(purchaseOrders.tenantId, tenant.id)),
  });
  if (!po) throw new Error("PO not found");
  const lines = await db.query.purchaseOrderLines.findMany({
    where: eq(purchaseOrderLines.purchaseOrderId, purchaseOrderId),
  });
  const number = await nextDocumentNumber(db, tenant.id, "grn");
  const [grn] = await db
    .insert(grns)
    .values({
      tenantId: tenant.id,
      number,
      purchaseOrderId,
      supplierId: po.supplierId,
      warehouseId,
      status: "posted",
      grnDate: todayISO(),
      createdBy: session.user.id,
    })
    .returning();
  for (const line of lines) {
    if (!line.itemId) continue;
    await db.insert(grnLines).values({
      tenantId: tenant.id,
      grnId: grn.id,
      purchaseOrderLineId: line.id,
      itemId: line.itemId,
      description: line.description,
      quantity: line.quantity,
      uom: line.uom,
      sequence: line.sequence ?? 1,
    });
    await applyStockMovement(db, {
      tenantId: tenant.id,
      warehouseId,
      itemId: line.itemId,
      quantity: Number(line.quantity),
      movementType: "in",
      referenceType: "grn",
      referenceId: grn.id,
      referenceNumber: number,
      createdBy: session.user.id,
    });
    await db
      .update(purchaseOrderLines)
      .set({ receivedQuantity: line.quantity })
      .where(eq(purchaseOrderLines.id, line.id));
  }
  await db.update(purchaseOrders).set({ status: "posted", updatedAt: new Date() }).where(eq(purchaseOrders.id, purchaseOrderId));
  await audit(tenant.id, session.user.id, "post", "grn", grn.id, grn);
  revalidatePath("/purchase/grn");
  revalidatePath("/inventory/stock");
}

export async function listQuotations() {
  const { tenant, db } = await requireModuleAccess("sales");
  return db.query.quotations.findMany({
    where: eq(quotations.tenantId, tenant.id),
    orderBy: [desc(quotations.createdAt)],
  });
}

export async function listSalesOrders() {
  const { tenant, db } = await requireModuleAccess("sales");
  return db.query.salesOrders.findMany({
    where: eq(salesOrders.tenantId, tenant.id),
    orderBy: [desc(salesOrders.createdAt)],
  });
}

export async function listPurchaseOrders() {
  const { tenant, db } = await requireModuleAccess("purchase");
  return db.query.purchaseOrders.findMany({
    where: eq(purchaseOrders.tenantId, tenant.id),
    orderBy: [desc(purchaseOrders.createdAt)],
  });
}

export async function listGrns() {
  const { tenant, db } = await requireModuleAccess("purchase");
  return db.query.grns.findMany({
    where: eq(grns.tenantId, tenant.id),
    orderBy: [desc(grns.createdAt)],
  });
}

export async function listCustomersOptions() {
  const { tenant, db } = await requireModuleAccess("sales");
  return db.query.customers.findMany({ where: eq(customers.tenantId, tenant.id) });
}

export async function listSuppliersOptions() {
  const { tenant, db } = await requireModuleAccess("purchase");
  return db.query.suppliers.findMany({ where: eq(suppliers.tenantId, tenant.id) });
}

export async function createEnquiry(formData: FormData) {
  const { tenant, session, db } = await requireModuleAccess("crm");
  const customerId = String(formData.get("customerId") || "") || null;
  const subject = String(formData.get("subject") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const quantity = String(formData.get("quantity") || "1");
  const itemId = String(formData.get("itemId") || "") || null;
  const number = await nextDocumentNumber(db, tenant.id, "enquiry");
  const [row] = await db
    .insert(enquiries)
    .values({
      tenantId: tenant.id,
      number,
      customerId,
      customerName: String(formData.get("customerName") || "") || null,
      subject: subject || "Customer enquiry",
      status: "draft",
      enquiryDate: todayISO(),
      notes: String(formData.get("notes") || "") || null,
      createdBy: session.user.id,
    })
    .returning();
  await db.insert(enquiryLines).values({
    tenantId: tenant.id,
    enquiryId: row.id,
    itemId,
    description: description || subject || "Line",
    quantity,
    uom: String(formData.get("uom") || "PCS"),
    sequence: 1,
  });
  await audit(tenant.id, session.user.id, "create", "enquiry", row.id, row);
  revalidatePath("/crm/enquiries");
}

export async function listEnquiries() {
  const { tenant, db } = await requireModuleAccess("crm");
  return db.query.enquiries.findMany({
    where: eq(enquiries.tenantId, tenant.id),
    orderBy: [desc(enquiries.createdAt)],
  });
}

export async function createPurchaseRequest(formData: FormData) {
  const { tenant, session, db } = await requireModuleAccess("purchase");
  const itemId = String(formData.get("itemId"));
  const quantity = String(formData.get("quantity") || "1");
  const item = await db.query.items.findFirst({
    where: and(eq(items.id, itemId), eq(items.tenantId, tenant.id)),
  });
  if (!item) throw new Error("Item not found");
  const number = await nextDocumentNumber(db, tenant.id, "purchaseRequest");
  const [row] = await db
    .insert(purchaseRequests)
    .values({
      tenantId: tenant.id,
      number,
      status: "draft",
      requestDate: todayISO(),
      requiredDate: String(formData.get("requiredDate") || "") || null,
      notes: String(formData.get("notes") || "") || null,
      createdBy: session.user.id,
    })
    .returning();
  await db.insert(purchaseRequestLines).values({
    tenantId: tenant.id,
    purchaseRequestId: row.id,
    itemId,
    description: item.name,
    quantity,
    uom: item.uom,
    sequence: 1,
  });
  await audit(tenant.id, session.user.id, "create", "purchase_request", row.id, row);
  revalidatePath("/purchase/requests");
}

export async function listPurchaseRequests() {
  const { tenant, db } = await requireModuleAccess("purchase");
  return db.query.purchaseRequests.findMany({
    where: eq(purchaseRequests.tenantId, tenant.id),
    orderBy: [desc(purchaseRequests.createdAt)],
  });
}

export async function listItemsForDocs() {
  const { tenant, db } = await requireModuleAccess("sales");
  return db.query.items.findMany({ where: eq(items.tenantId, tenant.id) });
}

export async function listItemsForPurchase() {
  const { tenant, db } = await requireModuleAccess("purchase");
  return db.query.items.findMany({ where: eq(items.tenantId, tenant.id) });
}
