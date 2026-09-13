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
import { customers, suppliers, items, warehouses } from "./masters";
import { salesOrders, salesOrderLines } from "./sales";
import { purchaseOrders } from "./purchase";

export const deliveryChallans = pgTable("delivery_challans", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  salesOrderId: uuid("sales_order_id").references(() => salesOrders.id),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  status: text("status").notNull().default("draft"),
  challanDate: date("challan_date").notNull(),
  transporter: text("transporter"),
  vehicleNumber: text("vehicle_number"),
  lrNumber: text("lr_number"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const deliveryChallanLines = pgTable("delivery_challan_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  deliveryChallanId: uuid("delivery_challan_id")
    .notNull()
    .references(() => deliveryChallans.id, { onDelete: "cascade" }),
  salesOrderLineId: uuid("sales_order_line_id").references(() => salesOrderLines.id),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  uom: text("uom").default("PCS"),
  sequence: integer("sequence").default(1),
});

export const salesInvoices = pgTable("sales_invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  salesOrderId: uuid("sales_order_id").references(() => salesOrders.id),
  deliveryChallanId: uuid("delivery_challan_id").references(() => deliveryChallans.id),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  status: text("status").notNull().default("draft"),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).default("0"),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 }).default("0"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const salesInvoiceLines = pgTable("sales_invoice_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  salesInvoiceId: uuid("sales_invoice_id")
    .notNull()
    .references(() => salesInvoices.id, { onDelete: "cascade" }),
  itemId: uuid("item_id").references(() => items.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  uom: text("uom").default("PCS"),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull().default("0"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).default("18"),
  hsn: text("hsn"),
  lineTotal: numeric("line_total", { precision: 14, scale: 2 }).default("0"),
  sequence: integer("sequence").default(1),
});

export const purchaseInvoices = pgTable("purchase_invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  status: text("status").notNull().default("draft"),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).default("0"),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 }).default("0"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const receipts = pgTable("receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  salesInvoiceId: uuid("sales_invoice_id").references(() => salesInvoices.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  receiptDate: date("receipt_date").notNull(),
  paymentMode: text("payment_mode").default("bank"),
  reference: text("reference"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  purchaseInvoiceId: uuid("purchase_invoice_id").references(() => purchaseInvoices.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  paymentMode: text("payment_mode").default("bank"),
  reference: text("reference"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  expenseDate: date("expense_date").notNull(),
  status: text("status").notNull().default("posted"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
