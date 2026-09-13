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
import { items, warehouses, workCenters } from "./masters";
import { salesOrders } from "./sales";
import { bomHeaders, routings, routingOperations } from "./engineering";

export const productionOrders = pgTable("production_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  salesOrderId: uuid("sales_order_id").references(() => salesOrders.id),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id),
  bomId: uuid("bom_id").references(() => bomHeaders.id),
  routingId: uuid("routing_id").references(() => routings.id),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  completedQuantity: numeric("completed_quantity", { precision: 14, scale: 3 }).default("0"),
  scrapQuantity: numeric("scrap_quantity", { precision: 14, scale: 3 }).default("0"),
  wipQuantity: numeric("wip_quantity", { precision: 14, scale: 3 }).default("0"),
  status: text("status").notNull().default("draft"),
  plannedStart: date("planned_start"),
  plannedEnd: date("planned_end"),
  priority: integer("priority").default(5),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const jobCards = pgTable("job_cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  productionOrderId: uuid("production_order_id")
    .notNull()
    .references(() => productionOrders.id, { onDelete: "cascade" }),
  routingOperationId: uuid("routing_operation_id").references(() => routingOperations.id),
  operationName: text("operation_name").notNull(),
  sequence: integer("sequence").notNull().default(1),
  workCenterId: uuid("work_center_id").references(() => workCenters.id),
  operatorName: text("operator_name"),
  requiredQuantity: numeric("required_quantity", { precision: 14, scale: 3 }).notNull(),
  completedQuantity: numeric("completed_quantity", { precision: 14, scale: 3 }).default("0"),
  scrapQuantity: numeric("scrap_quantity", { precision: 14, scale: 3 }).default("0"),
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  downtimeMinutes: numeric("downtime_minutes", { precision: 10, scale: 2 }).default("0"),
  downtimeReason: text("downtime_reason"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const qcInspections = pgTable("qc_inspections", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  stage: text("stage").notNull().default("final"), // incoming | in_process | final
  productionOrderId: uuid("production_order_id").references(() => productionOrders.id),
  jobCardId: uuid("job_card_id").references(() => jobCards.id),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  inspectedQuantity: numeric("inspected_quantity", { precision: 14, scale: 3 }).notNull(),
  passedQuantity: numeric("passed_quantity", { precision: 14, scale: 3 }).default("0"),
  rejectedQuantity: numeric("rejected_quantity", { precision: 14, scale: 3 }).default("0"),
  status: text("status").notNull().default("pending"),
  result: text("result"), // pass | fail | partial
  inspectorName: text("inspector_name"),
  notes: text("notes"),
  inspectedAt: timestamp("inspected_at", { withTimezone: true }),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const materialIssues = pgTable("material_issues", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  productionOrderId: uuid("production_order_id").references(() => productionOrders.id),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  status: text("status").notNull().default("draft"),
  issueDate: date("issue_date").notNull(),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const materialIssueLines = pgTable("material_issue_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  materialIssueId: uuid("material_issue_id")
    .notNull()
    .references(() => materialIssues.id, { onDelete: "cascade" }),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  uom: text("uom").default("PCS"),
});
