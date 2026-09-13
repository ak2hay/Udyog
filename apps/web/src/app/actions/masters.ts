import { eq, desc } from "drizzle-orm";
import {
  getDb,
  customers,
  suppliers,
  items,
  warehouses,
  stockBalances,
  stockMovements,
  workCenters,
  auditLogs,
  nextDocumentNumber,
  applyStockMovement,
} from "@rkyves/db";
import { requireModuleAccess } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function audit(
  tenantId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  newValue?: unknown,
) {
  const db = getDb();
  await db.insert(auditLogs).values({
    tenantId,
    userId,
    action,
    entityType,
    entityId,
    newValue: newValue as object,
  });
}

export async function createCustomer(formData: FormData) {
  "use server";
  const { tenant, session, db } = await requireModuleAccess("crm");
  const code = String(formData.get("code") || "").trim();
  const name = String(formData.get("name") || "").trim();
  if (!code || !name) throw new Error("Code and name required");
  const [row] = await db
    .insert(customers)
    .values({
      tenantId: tenant.id,
      code,
      name,
      gstin: String(formData.get("gstin") || "") || null,
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      contactPerson: String(formData.get("contactPerson") || "") || null,
      billingAddress: String(formData.get("billingAddress") || "") || null,
      paymentTerms: String(formData.get("paymentTerms") || "Net 30"),
      creditLimit: String(formData.get("creditLimit") || "0"),
    })
    .returning();
  await audit(tenant.id, session.user.id, "create", "customer", row.id, row);
  revalidatePath("/crm/customers");
}

export async function createSupplier(formData: FormData) {
  "use server";
  const { tenant, session, db } = await requireModuleAccess("purchase");
  const [row] = await db
    .insert(suppliers)
    .values({
      tenantId: tenant.id,
      code: String(formData.get("code")),
      name: String(formData.get("name")),
      gstin: String(formData.get("gstin") || "") || null,
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      contactPerson: String(formData.get("contactPerson") || "") || null,
      leadTimeDays: String(formData.get("leadTimeDays") || "7"),
    })
    .returning();
  await audit(tenant.id, session.user.id, "create", "supplier", row.id, row);
  revalidatePath("/purchase/suppliers");
}

export async function createItem(formData: FormData) {
  "use server";
  const { tenant, session, db } = await requireModuleAccess("inventory");
  const [row] = await db
    .insert(items)
    .values({
      tenantId: tenant.id,
      code: String(formData.get("code")),
      name: String(formData.get("name")),
      itemType: String(formData.get("itemType") || "raw_material"),
      uom: String(formData.get("uom") || "PCS"),
      material: String(formData.get("material") || "") || null,
      materialGrade: String(formData.get("materialGrade") || "") || null,
      drawingNumber: String(formData.get("drawingNumber") || "") || null,
      hsn: String(formData.get("hsn") || "") || null,
      gstRate: String(formData.get("gstRate") || "18"),
      minStock: String(formData.get("minStock") || "0"),
      reorderLevel: String(formData.get("reorderLevel") || "0"),
      salePrice: String(formData.get("salePrice") || "0"),
      purchasePrice: String(formData.get("purchasePrice") || "0"),
    })
    .returning();
  await audit(tenant.id, session.user.id, "create", "item", row.id, row);
  revalidatePath("/inventory/items");
}

export async function createWarehouse(formData: FormData) {
  "use server";
  const { tenant, db } = await requireModuleAccess("inventory");
  await db.insert(warehouses).values({
    tenantId: tenant.id,
    code: String(formData.get("code")),
    name: String(formData.get("name")),
    isDefault: formData.get("isDefault") === "on",
  });
  revalidatePath("/inventory/stock");
}

export async function adjustStock(formData: FormData) {
  "use server";
  const { tenant, session, db } = await requireModuleAccess("inventory");
  const warehouseId = String(formData.get("warehouseId"));
  const itemId = String(formData.get("itemId"));
  const quantity = Number(formData.get("quantity"));
  const notes = String(formData.get("notes") || "Manual adjustment");
  const number = await nextDocumentNumber(db, tenant.id, "stockAdjustment");
  await applyStockMovement(db, {
    tenantId: tenant.id,
    warehouseId,
    itemId,
    quantity,
    movementType: "adjustment",
    referenceType: "stock_adjustment",
    referenceNumber: number,
    notes,
    createdBy: session.user.id,
  });
  await audit(tenant.id, session.user.id, "adjust", "stock", itemId, { quantity, number });
  revalidatePath("/inventory/stock");
}

export async function listCustomers() {
  const { tenant, db } = await requireModuleAccess("crm");
  return db.query.customers.findMany({
    where: eq(customers.tenantId, tenant.id),
    orderBy: [desc(customers.createdAt)],
  });
}

export async function listSuppliers() {
  const { tenant, db } = await requireModuleAccess("purchase");
  return db.query.suppliers.findMany({
    where: eq(suppliers.tenantId, tenant.id),
    orderBy: [desc(suppliers.createdAt)],
  });
}

export async function listItems() {
  const { tenant, db } = await requireModuleAccess("inventory");
  return db.query.items.findMany({
    where: eq(items.tenantId, tenant.id),
    orderBy: [desc(items.createdAt)],
  });
}

export async function listWarehouses() {
  const { tenant, db } = await requireModuleAccess("inventory");
  return db.query.warehouses.findMany({
    where: eq(warehouses.tenantId, tenant.id),
  });
}

export async function listStock() {
  const { tenant, db } = await requireModuleAccess("inventory");
  const balances = await db
    .select({
      id: stockBalances.id,
      quantity: stockBalances.quantity,
      reservedQuantity: stockBalances.reservedQuantity,
      itemCode: items.code,
      itemName: items.name,
      uom: items.uom,
      minStock: items.minStock,
      reorderLevel: items.reorderLevel,
      warehouseName: warehouses.name,
      warehouseId: warehouses.id,
      itemId: items.id,
    })
    .from(stockBalances)
    .innerJoin(items, eq(stockBalances.itemId, items.id))
    .innerJoin(warehouses, eq(stockBalances.warehouseId, warehouses.id))
    .where(eq(stockBalances.tenantId, tenant.id));
  return balances;
}

export async function listRecentMovements() {
  const { tenant, db } = await requireModuleAccess("inventory");
  return db.query.stockMovements.findMany({
    where: eq(stockMovements.tenantId, tenant.id),
    orderBy: [desc(stockMovements.createdAt)],
    limit: 20,
  });
}

export async function createWorkCenter(formData: FormData) {
  "use server";
  const { tenant, session, db } = await requireModuleAccess("manufacturing");
  const [row] = await db
    .insert(workCenters)
    .values({
      tenantId: tenant.id,
      code: String(formData.get("code")),
      name: String(formData.get("name")),
      machineName: String(formData.get("machineName") || "") || null,
      capacityPerHour: String(formData.get("capacityPerHour") || "") || null,
    })
    .returning();
  await audit(tenant.id, session.user.id, "create", "work_center", row.id, row);
  revalidatePath("/manufacturing/work-centers");
}

export async function listWorkCenters() {
  const { tenant, db } = await requireModuleAccess("manufacturing");
  return db.query.workCenters.findMany({
    where: eq(workCenters.tenantId, tenant.id),
    orderBy: [desc(workCenters.createdAt)],
  });
}
