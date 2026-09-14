import {
  pgTable,
  text,
  timestamp,
  uuid,
  date,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";

export type TallyExportCounts = {
  customers: number;
  suppliers: number;
  items: number;
  units: number;
  salesInvoices: number;
  purchaseInvoices: number;
  receipts: number;
  payments: number;
  expenses: number;
};

export type TallyExportIncludes = {
  masters: boolean;
  sales: boolean;
  purchase: boolean;
  receipts: boolean;
  payments: boolean;
  expenses: boolean;
};

export const tallyExportBatches = pgTable(
  "tally_export_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    batchNumber: text("batch_number").notNull(),
    fromDate: date("from_date").notNull(),
    toDate: date("to_date").notNull(),
    /** range | since_last */
    mode: text("mode").notNull().default("range"),
    /** preview | exported | failed */
    status: text("status").notNull().default("preview"),
    includes: jsonb("includes").$type<TallyExportIncludes>(),
    counts: jsonb("counts").$type<TallyExportCounts>(),
    warnings: jsonb("warnings").$type<string[]>().default([]),
    errors: jsonb("errors").$type<string[]>().default([]),
    /** When true, include entities already exported in prior batches */
    reexport: text("reexport").default("false"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    exportedAt: timestamp("exported_at", { withTimezone: true }),
  },
  (t) => [index("tally_export_batches_tenant").on(t.tenantId)],
);

export const tallyExportItems = pgTable(
  "tally_export_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => tallyExportBatches.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    externalKey: text("external_key"),
    /** included | skipped | failed */
    status: text("status").notNull().default("included"),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("tally_export_items_batch").on(t.batchId),
    index("tally_export_items_entity").on(t.tenantId, t.entityType, t.entityId),
  ],
);
