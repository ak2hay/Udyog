import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  numeric,
  date,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { suppliers, items, warehouses } from "./masters";

export const purchaseRequests = pgTable("purchase_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  status: text("status").notNull().default("draft"),
  requestDate: date("request_date").notNull(),
  requiredDate: date("required_date"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const purchaseRequestLines = pgTable("purchase_request_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  purchaseRequestId: uuid("purchase_request_id")
    .notNull()
    .references(() => purchaseRequests.id, { onDelete: "cascade" }),
  itemId: uuid("item_id").references(() => items.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  uom: text("uom").default("PCS"),
  sequence: integer("sequence").default(1),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  purchaseRequestId: uuid("purchase_request_id").references(() => purchaseRequests.id),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  status: text("status").notNull().default("draft"),
  orderDate: date("order_date").notNull(),
  expectedDate: date("expected_date"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).default("0"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const purchaseOrderLines = pgTable("purchase_order_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  purchaseOrderId: uuid("purchase_order_id")
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: "cascade" }),
  itemId: uuid("item_id").references(() => items.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  receivedQuantity: numeric("received_quantity", { precision: 14, scale: 3 }).default("0"),
  uom: text("uom").default("PCS"),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull().default("0"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).default("18"),
  hsn: text("hsn"),
  lineTotal: numeric("line_total", { precision: 14, scale: 2 }).default("0"),
  sequence: integer("sequence").default(1),
});

export const grns = pgTable("grns", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id),
  supplierId: uuid("supplier_id").references(() => suppliers.id),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  status: text("status").notNull().default("draft"),
  grnDate: date("grn_date").notNull(),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const grnLines = pgTable("grn_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  grnId: uuid("grn_id")
    .notNull()
    .references(() => grns.id, { onDelete: "cascade" }),
  purchaseOrderLineId: uuid("purchase_order_line_id").references(() => purchaseOrderLines.id),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  uom: text("uom").default("PCS"),
  sequence: integer("sequence").default(1),
});
