import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { items, workCenters } from "./masters";

export const bomHeaders = pgTable(
  "bom_headers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id),
    revision: text("revision").notNull().default("A"),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull().default("1"),
    scrapPercent: numeric("scrap_percent", { precision: 6, scale: 2 }).default("0"),
    status: text("status").notNull().default("active"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("bom_item_revision").on(t.tenantId, t.itemId, t.revision)],
);

export const bomLines = pgTable("bom_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  bomId: uuid("bom_id")
    .notNull()
    .references(() => bomHeaders.id, { onDelete: "cascade" }),
  componentItemId: uuid("component_item_id")
    .notNull()
    .references(() => items.id),
  quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  uom: text("uom").notNull().default("PCS"),
  scrapPercent: numeric("scrap_percent", { precision: 6, scale: 2 }).default("0"),
  sequence: integer("sequence").default(1).notNull(),
  notes: text("notes"),
});

export const routings = pgTable(
  "routings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id),
    revision: text("revision").notNull().default("A"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("routing_item_revision").on(t.tenantId, t.itemId, t.revision)],
);

export const routingOperations = pgTable("routing_operations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  routingId: uuid("routing_id")
    .notNull()
    .references(() => routings.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(),
  operationName: text("operation_name").notNull(),
  workCenterId: uuid("work_center_id").references(() => workCenters.id),
  setupMinutes: numeric("setup_minutes", { precision: 10, scale: 2 }).default("0"),
  runMinutesPerUnit: numeric("run_minutes_per_unit", { precision: 10, scale: 4 }).default("0"),
  laborCost: numeric("labor_cost", { precision: 12, scale: 2 }).default("0"),
  machineCost: numeric("machine_cost", { precision: 12, scale: 2 }).default("0"),
  qualityCheckRequired: boolean("quality_check_required").default(false).notNull(),
  notes: text("notes"),
});
