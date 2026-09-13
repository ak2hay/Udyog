import { and, eq, sql } from "drizzle-orm";
import { DOCUMENT_PREFIXES, type DocumentType } from "@rkyves/shared";
import type { Database } from "./index";
import { documentSequences, stockBalances, stockMovements } from "./schema";

export async function nextDocumentNumber(
  db: Database,
  tenantId: string,
  docType: DocumentType,
  year = new Date().getFullYear(),
) {
  const prefix = DOCUMENT_PREFIXES[docType];
  const existing = await db.query.documentSequences.findFirst({
    where: and(
      eq(documentSequences.tenantId, tenantId),
      eq(documentSequences.docType, docType),
      eq(documentSequences.year, year),
    ),
  });

  let next = 1;
  if (existing) {
    next = existing.lastNumber + 1;
    await db
      .update(documentSequences)
      .set({ lastNumber: next })
      .where(eq(documentSequences.id, existing.id));
  } else {
    await db.insert(documentSequences).values({
      tenantId,
      docType,
      year,
      lastNumber: 1,
    });
  }

  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

export async function applyStockMovement(
  db: Database,
  input: {
    tenantId: string;
    warehouseId: string;
    itemId: string;
    quantity: number; // positive = in, negative = out
    movementType: string;
    referenceType?: string;
    referenceId?: string;
    referenceNumber?: string;
    notes?: string;
    createdBy?: string;
  },
) {
  const qty = input.quantity;
  const absQty = Math.abs(qty);

  await db.insert(stockMovements).values({
    tenantId: input.tenantId,
    warehouseId: input.warehouseId,
    itemId: input.itemId,
    movementType: input.movementType,
    quantity: String(qty),
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    referenceNumber: input.referenceNumber,
    notes: input.notes,
    createdBy: input.createdBy,
  });

  const balance = await db.query.stockBalances.findFirst({
    where: and(
      eq(stockBalances.tenantId, input.tenantId),
      eq(stockBalances.warehouseId, input.warehouseId),
      eq(stockBalances.itemId, input.itemId),
    ),
  });

  if (balance) {
    await db
      .update(stockBalances)
      .set({
        quantity: sql`${stockBalances.quantity} + ${qty}`,
        updatedAt: new Date(),
      })
      .where(eq(stockBalances.id, balance.id));
  } else {
    await db.insert(stockBalances).values({
      tenantId: input.tenantId,
      warehouseId: input.warehouseId,
      itemId: input.itemId,
      quantity: String(qty),
      reservedQuantity: "0",
    });
  }

  return absQty;
}
