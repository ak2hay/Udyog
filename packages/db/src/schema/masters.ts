import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants, branches } from "./core";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    gstin: text("gstin"),
    pan: text("pan"),
    billingAddress: text("billing_address"),
    shippingAddress: text("shipping_address"),
    contactPerson: text("contact_person"),
    email: text("email"),
    phone: text("phone"),
    paymentTerms: text("payment_terms").default("Net 30"),
    creditLimit: numeric("credit_limit", { precision: 14, scale: 2 }).default("0"),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("customers_tenant_code").on(t.tenantId, t.code)],
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    gstin: text("gstin"),
    pan: text("pan"),
    address: text("address"),
    contactPerson: text("contact_person"),
    email: text("email"),
    phone: text("phone"),
    paymentTerms: text("payment_terms").default("Net 30"),
    leadTimeDays: numeric("lead_time_days", { precision: 6, scale: 0 }).default("7"),
    rating: numeric("rating", { precision: 3, scale: 1 }),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("suppliers_tenant_code").on(t.tenantId, t.code)],
);

export const items = pgTable(
  "items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    itemType: text("item_type").notNull().default("raw_material"),
    category: text("category"),
    material: text("material"),
    materialGrade: text("material_grade"),
    dimensions: text("dimensions"),
    weight: numeric("weight", { precision: 12, scale: 4 }),
    uom: text("uom").notNull().default("PCS"),
    drawingNumber: text("drawing_number"),
    drawingRevision: text("drawing_revision"),
    customerPartNumber: text("customer_part_number"),
    hsn: text("hsn"),
    gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).default("18"),
    minStock: numeric("min_stock", { precision: 14, scale: 3 }).default("0"),
    reorderLevel: numeric("reorder_level", { precision: 14, scale: 3 }).default("0"),
    batchTracking: boolean("batch_tracking").default(false).notNull(),
    serialTracking: boolean("serial_tracking").default(false).notNull(),
    salePrice: numeric("sale_price", { precision: 14, scale: 2 }).default("0"),
    purchasePrice: numeric("purchase_price", { precision: 14, scale: 2 }).default("0"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("items_tenant_code").on(t.tenantId, t.code)],
);

export const warehouses = pgTable(
  "warehouses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("warehouses_tenant_code").on(t.tenantId, t.code)],
);

export const stockBalances = pgTable(
  "stock_balances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull().default("0"),
    reservedQuantity: numeric("reserved_quantity", { precision: 14, scale: 3 })
      .notNull()
      .default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("stock_balances_wh_item").on(t.tenantId, t.warehouseId, t.itemId),
  ],
);

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id),
  movementType: text("movement_type").notNull(), // in | out | transfer | adjustment
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workCenters = pgTable(
  "work_centers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    machineName: text("machine_name"),
    capacityPerHour: numeric("capacity_per_hour", { precision: 10, scale: 2 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("work_centers_tenant_code").on(t.tenantId, t.code)],
);
