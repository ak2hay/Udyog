"use server";

import { and, eq, desc, sql } from "drizzle-orm";
import {
  deliveryChallans,
  deliveryChallanLines,
  salesInvoices,
  salesInvoiceLines,
  purchaseInvoices,
  receipts,
  payments,
  expenses,
  salesOrders,
  salesOrderLines,
  purchaseOrders,
  customers,
  suppliers,
  warehouses,
  items,
  stockBalances,
  productionOrders,
  auditLogs,
  nextDocumentNumber,
  applyStockMovement,
  tenants,
} from "@rkyves/db";
import { requireModuleAccess } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { todayISO } from "@/lib/utils";

async function audit(
  tenantId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  newValue?: unknown,
) {
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

export async function createDispatch(formData: FormData) {
  const { tenant, session, db } = await requireModuleAccess("sales");
  const salesOrderId = String(formData.get("salesOrderId"));
  const warehouseId = String(formData.get("warehouseId"));
  const so = await db.query.salesOrders.findFirst({
    where: and(eq(salesOrders.id, salesOrderId), eq(salesOrders.tenantId, tenant.id)),
  });
  if (!so) throw new Error("Sales order not found");
  const lines = await db.query.salesOrderLines.findMany({
    where: eq(salesOrderLines.salesOrderId, salesOrderId),
  });
  const number = await nextDocumentNumber(db, tenant.id, "deliveryChallan");
  const [dc] = await db
    .insert(deliveryChallans)
    .values({
      tenantId: tenant.id,
      number,
      salesOrderId,
      customerId: so.customerId,
      warehouseId,
      status: "posted",
      challanDate: todayISO(),
      transporter: String(formData.get("transporter") || "") || null,
      vehicleNumber: String(formData.get("vehicleNumber") || "") || null,
      createdBy: session.user.id,
    })
    .returning();

  for (const line of lines) {
    if (!line.itemId) continue;
    await db.insert(deliveryChallanLines).values({
      tenantId: tenant.id,
      deliveryChallanId: dc.id,
      salesOrderLineId: line.id,
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
      quantity: -Number(line.quantity),
      movementType: "out",
      referenceType: "delivery_challan",
      referenceId: dc.id,
      referenceNumber: number,
      createdBy: session.user.id,
    });
    await db
      .update(salesOrderLines)
      .set({ deliveredQuantity: line.quantity })
      .where(eq(salesOrderLines.id, line.id));
  }

  await db.update(salesOrders).set({ status: "completed", updatedAt: new Date() }).where(eq(salesOrders.id, salesOrderId));
  await audit(tenant.id, session.user.id, "post", "delivery_challan", dc.id, dc);
  revalidatePath("/sales/dispatch");
  revalidatePath("/inventory/stock");
  return dc.id;
}

export async function createSalesInvoiceFromDispatch(deliveryChallanId: string) {
  const { tenant, session, db } = await requireModuleAccess("sales");
  const dc = await db.query.deliveryChallans.findFirst({
    where: and(eq(deliveryChallans.id, deliveryChallanId), eq(deliveryChallans.tenantId, tenant.id)),
  });
  if (!dc) throw new Error("Challan not found");
  const lines = await db.query.deliveryChallanLines.findMany({
    where: eq(deliveryChallanLines.deliveryChallanId, deliveryChallanId),
  });
  const so = dc.salesOrderId
    ? await db.query.salesOrders.findFirst({ where: eq(salesOrders.id, dc.salesOrderId) })
    : null;

  const number = await nextDocumentNumber(db, tenant.id, "salesInvoice");
  const [inv] = await db
    .insert(salesInvoices)
    .values({
      tenantId: tenant.id,
      number,
      salesOrderId: dc.salesOrderId,
      deliveryChallanId,
      customerId: dc.customerId,
      status: "posted",
      invoiceDate: todayISO(),
      dueDate: todayISO(),
      subtotal: so?.subtotal ?? "0",
      taxAmount: so?.taxAmount ?? "0",
      totalAmount: so?.totalAmount ?? "0",
      createdBy: session.user.id,
    })
    .returning();

  for (const line of lines) {
    const soLine = line.salesOrderLineId
      ? await db.query.salesOrderLines.findFirst({ where: eq(salesOrderLines.id, line.salesOrderLineId) })
      : null;
    await db.insert(salesInvoiceLines).values({
      tenantId: tenant.id,
      salesInvoiceId: inv.id,
      itemId: line.itemId,
      description: line.description,
      quantity: line.quantity,
      uom: line.uom,
      unitPrice: soLine?.unitPrice ?? "0",
      gstRate: soLine?.gstRate ?? "18",
      hsn: soLine?.hsn,
      lineTotal: soLine?.lineTotal ?? "0",
      sequence: line.sequence ?? 1,
    });
  }

  await audit(tenant.id, session.user.id, "create", "sales_invoice", inv.id, inv);
  revalidatePath("/sales/invoices");
  revalidatePath("/finance/receivables");
  return inv.id;
}

export async function createReceipt(formData: FormData) {
  const { tenant, session, db } = await requireModuleAccess("finance");
  const salesInvoiceId = String(formData.get("salesInvoiceId"));
  const amount = String(formData.get("amount"));
  const inv = await db.query.salesInvoices.findFirst({
    where: and(eq(salesInvoices.id, salesInvoiceId), eq(salesInvoices.tenantId, tenant.id)),
  });
  if (!inv) throw new Error("Invoice not found");
  const number = await nextDocumentNumber(db, tenant.id, "receipt");
  await db.insert(receipts).values({
    tenantId: tenant.id,
    number,
    customerId: inv.customerId,
    salesInvoiceId,
    amount,
    receiptDate: todayISO(),
    paymentMode: String(formData.get("paymentMode") || "bank"),
    reference: String(formData.get("reference") || "") || null,
    createdBy: session.user.id,
  });
  const paid = Number(inv.paidAmount || 0) + Number(amount);
  await db
    .update(salesInvoices)
    .set({
      paidAmount: String(paid),
      updatedAt: new Date(),
    })
    .where(eq(salesInvoices.id, salesInvoiceId));
  revalidatePath("/finance/receivables");
  revalidatePath("/sales/invoices");
}

export async function createPurchaseInvoice(formData: FormData) {
  const { tenant, session, db } = await requireModuleAccess("finance");
  const purchaseOrderId = String(formData.get("purchaseOrderId"));
  const po = await db.query.purchaseOrders.findFirst({
    where: and(eq(purchaseOrders.id, purchaseOrderId), eq(purchaseOrders.tenantId, tenant.id)),
  });
  if (!po) throw new Error("PO not found");
  const number = await nextDocumentNumber(db, tenant.id, "purchaseInvoice");
  await db.insert(purchaseInvoices).values({
    tenantId: tenant.id,
    number,
    purchaseOrderId,
    supplierId: po.supplierId,
    status: "posted",
    invoiceDate: todayISO(),
    subtotal: po.subtotal,
    taxAmount: po.taxAmount,
    totalAmount: po.totalAmount,
    createdBy: session.user.id,
  });
  revalidatePath("/finance/payables");
}

export async function createPayment(formData: FormData) {
  const { tenant, session, db } = await requireModuleAccess("finance");
  const purchaseInvoiceId = String(formData.get("purchaseInvoiceId"));
  const amount = String(formData.get("amount"));
  const inv = await db.query.purchaseInvoices.findFirst({
    where: and(eq(purchaseInvoices.id, purchaseInvoiceId), eq(purchaseInvoices.tenantId, tenant.id)),
  });
  if (!inv) throw new Error("Invoice not found");
  const number = await nextDocumentNumber(db, tenant.id, "payment");
  await db.insert(payments).values({
    tenantId: tenant.id,
    number,
    supplierId: inv.supplierId,
    purchaseInvoiceId,
    amount,
    paymentDate: todayISO(),
    paymentMode: String(formData.get("paymentMode") || "bank"),
    createdBy: session.user.id,
  });
  const paid = Number(inv.paidAmount || 0) + Number(amount);
  await db
    .update(purchaseInvoices)
    .set({ paidAmount: String(paid), updatedAt: new Date() })
    .where(eq(purchaseInvoices.id, purchaseInvoiceId));
  revalidatePath("/finance/payables");
}

export async function createExpense(formData: FormData) {
  const { tenant, session, db } = await requireModuleAccess("finance");
  await db.insert(expenses).values({
    tenantId: tenant.id,
    category: String(formData.get("category")),
    description: String(formData.get("description")),
    amount: String(formData.get("amount")),
    expenseDate: todayISO(),
    createdBy: session.user.id,
  });
  revalidatePath("/finance/payables");
}

export async function listDispatches() {
  const { tenant, db } = await requireModuleAccess("sales");
  return db.query.deliveryChallans.findMany({
    where: eq(deliveryChallans.tenantId, tenant.id),
    orderBy: [desc(deliveryChallans.createdAt)],
  });
}

export async function listSalesInvoices() {
  const { tenant, db } = await requireModuleAccess("sales");
  return db.query.salesInvoices.findMany({
    where: eq(salesInvoices.tenantId, tenant.id),
    orderBy: [desc(salesInvoices.createdAt)],
  });
}

export async function listPurchaseInvoices() {
  const { tenant, db } = await requireModuleAccess("finance");
  return db.query.purchaseInvoices.findMany({
    where: eq(purchaseInvoices.tenantId, tenant.id),
    orderBy: [desc(purchaseInvoices.createdAt)],
  });
}

export async function listReceipts() {
  const { tenant, db } = await requireModuleAccess("finance");
  return db.query.receipts.findMany({
    where: eq(receipts.tenantId, tenant.id),
    orderBy: [desc(receipts.createdAt)],
  });
}

export async function listPayments() {
  const { tenant, db } = await requireModuleAccess("finance");
  return db.query.payments.findMany({
    where: eq(payments.tenantId, tenant.id),
    orderBy: [desc(payments.createdAt)],
  });
}

export async function listAuditLogs() {
  const { tenant, db } = await requireModuleAccess("admin");
  return db.query.auditLogs.findMany({
    where: eq(auditLogs.tenantId, tenant.id),
    orderBy: [desc(auditLogs.createdAt)],
    limit: 100,
  });
}

export async function getDashboardStats() {
  const { tenant, db } = await requireModuleAccess("dashboard");
  const tenantId = tenant.id;

  const [
    [soCount],
    [moCount],
    [ar],
    [ap],
    [openInv],
    [low],
  ] = await Promise.all([
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(salesOrders)
      .where(eq(salesOrders.tenantId, tenantId)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(productionOrders)
      .where(eq(productionOrders.tenantId, tenantId)),
    db
      .select({
        v: sql<string>`coalesce(sum(${salesInvoices.totalAmount}::numeric - coalesce(${salesInvoices.paidAmount}::numeric, 0)), 0)`,
      })
      .from(salesInvoices)
      .where(eq(salesInvoices.tenantId, tenantId)),
    db
      .select({
        v: sql<string>`coalesce(sum(${purchaseInvoices.totalAmount}::numeric - coalesce(${purchaseInvoices.paidAmount}::numeric, 0)), 0)`,
      })
      .from(purchaseInvoices)
      .where(eq(purchaseInvoices.tenantId, tenantId)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(salesInvoices)
      .where(
        and(
          eq(salesInvoices.tenantId, tenantId),
          sql`${salesInvoices.totalAmount}::numeric > coalesce(${salesInvoices.paidAmount}::numeric, 0)`,
        ),
      ),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(stockBalances)
      .innerJoin(items, eq(stockBalances.itemId, items.id))
      .where(
        and(
          eq(stockBalances.tenantId, tenantId),
          sql`${stockBalances.quantity}::numeric < coalesce(${items.reorderLevel}::numeric, 0)`,
        ),
      ),
  ]);

  return {
    salesOrders: Number(soCount?.c ?? 0),
    productionOrders: Number(moCount?.c ?? 0),
    receivables: Number(ar?.v ?? 0),
    payables: Number(ap?.v ?? 0),
    lowStock: Number(low?.c ?? 0),
    openInvoices: Number(openInv?.c ?? 0),
  };
}

export async function updateCompany(formData: FormData) {
  const { tenant, db } = await requireModuleAccess("admin");
  await db
    .update(tenants)
    .set({
      name: String(formData.get("name") || tenant.name),
      legalName: String(formData.get("legalName") || "") || null,
      gstin: String(formData.get("gstin") || "") || null,
      pan: String(formData.get("pan") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      email: String(formData.get("email") || "") || null,
      city: String(formData.get("city") || "") || null,
      state: String(formData.get("state") || "") || null,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenant.id));
  revalidatePath("/admin/company");
}

export async function listCustomersFin() {
  const { tenant, db } = await requireModuleAccess("sales");
  return db.query.customers.findMany({ where: eq(customers.tenantId, tenant.id) });
}

export async function listWarehousesFin() {
  const { tenant, db } = await requireModuleAccess("sales");
  return db.query.warehouses.findMany({ where: eq(warehouses.tenantId, tenant.id) });
}

export async function listSalesOrdersFin() {
  const { tenant, db } = await requireModuleAccess("sales");
  return db.query.salesOrders.findMany({
    where: eq(salesOrders.tenantId, tenant.id),
    orderBy: [desc(salesOrders.createdAt)],
  });
}

export async function listPurchaseOrdersFin() {
  const { tenant, db } = await requireModuleAccess("purchase");
  return db.query.purchaseOrders.findMany({
    where: eq(purchaseOrders.tenantId, tenant.id),
    orderBy: [desc(purchaseOrders.createdAt)],
  });
}

export async function listSuppliersFin() {
  const { tenant, db } = await requireModuleAccess("purchase");
  return db.query.suppliers.findMany({ where: eq(suppliers.tenantId, tenant.id) });
}

export async function getSalesInvoice(invoiceId: string) {
  const { tenant, db } = await requireModuleAccess("sales");
  const invoice = await db.query.salesInvoices.findFirst({
    where: and(eq(salesInvoices.id, invoiceId), eq(salesInvoices.tenantId, tenant.id)),
  });
  if (!invoice) return null;
  const lines = await db.query.salesInvoiceLines.findMany({
    where: eq(salesInvoiceLines.salesInvoiceId, invoiceId),
  });
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, invoice.customerId),
  });
  return { invoice, lines, customer, company: tenant };
}
