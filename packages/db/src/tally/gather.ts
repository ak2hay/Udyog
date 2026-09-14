import { and, eq, gte, lte, inArray } from "drizzle-orm";
import type { Database } from "../index";
import {
  customers,
  suppliers,
  items,
  salesInvoices,
  salesInvoiceLines,
  purchaseInvoices,
  receipts,
  payments,
  expenses,
  tenants,
  tallyExportItems,
} from "../schema";
import type { TallyExportIncludes } from "../schema/tally";
import { DEFAULT_INCLUDES } from "./types";
import type {
  AccountingExportPayload,
  ExportCounts,
  ExportExpense,
  ExportItem,
  ExportParty,
  ExportPayment,
  ExportPurchaseInvoice,
  ExportReceipt,
  ExportSalesInvoice,
  ExportSalesLine,
} from "./types";
import { buildTaxBreakdown, num, resolveGstMode, round2 } from "./gst";

export type GatherOptions = {
  tenantId: string;
  fromDate: string;
  toDate: string;
  includes?: Partial<TallyExportIncludes>;
  /** Skip entity IDs already exported unless reexport is true */
  reexport?: boolean;
  previouslyExportedIds?: Partial<Record<string, string[]>>;
};

export async function loadPreviouslyExportedIds(
  db: Database,
  tenantId: string,
): Promise<Partial<Record<string, string[]>>> {
  const rows = await db
    .select({
      entityType: tallyExportItems.entityType,
      entityId: tallyExportItems.entityId,
    })
    .from(tallyExportItems)
    .where(
      and(
        eq(tallyExportItems.tenantId, tenantId),
        eq(tallyExportItems.status, "included"),
      ),
    );

  const map: Record<string, Set<string>> = {};
  for (const row of rows) {
    if (!map[row.entityType]) map[row.entityType] = new Set();
    map[row.entityType].add(row.entityId);
  }
  const out: Partial<Record<string, string[]>> = {};
  for (const [k, v] of Object.entries(map)) {
    out[k] = [...v];
  }
  return out;
}

function filterOutExported<T extends { id: string }>(
  rows: T[],
  entityType: string,
  reexport: boolean,
  previouslyExportedIds?: Partial<Record<string, string[]>>,
): T[] {
  if (reexport) return rows;
  const skip = new Set(previouslyExportedIds?.[entityType] || []);
  if (skip.size === 0) return rows;
  return rows.filter((r) => !skip.has(r.id));
}

export async function gatherExportPayload(
  db: Database,
  options: GatherOptions,
): Promise<AccountingExportPayload> {
  const includes: TallyExportIncludes = { ...DEFAULT_INCLUDES, ...options.includes };
  const reexport = options.reexport ?? false;
  const prev = options.previouslyExportedIds;

  const company = await db.query.tenants.findFirst({
    where: eq(tenants.id, options.tenantId),
  });
  if (!company) throw new Error("Tenant not found");

  const companyGstin = company.gstin;
  const stateCode = companyGstin?.trim().slice(0, 2) || null;

  let customerRows: ExportParty[] = [];
  let supplierRows: ExportParty[] = [];
  let itemRows: ExportItem[] = [];
  let units: string[] = [];
  let salesRows: ExportSalesInvoice[] = [];
  let purchaseRows: ExportPurchaseInvoice[] = [];
  let receiptRows: ExportReceipt[] = [];
  let paymentRows: ExportPayment[] = [];
  let expenseRows: ExportExpense[] = [];
  const taxRates = new Set<number>();

  if (includes.masters || includes.sales || includes.receipts) {
    const rawCustomers = await db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, options.tenantId), eq(customers.isActive, true)));
    customerRows = filterOutExported(
      rawCustomers.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        gstin: c.gstin,
        pan: c.pan,
        address: c.billingAddress,
        email: c.email,
        phone: c.phone,
        kind: "customer" as const,
      })),
      "customer",
      reexport || !includes.masters,
      // Always include parties referenced by vouchers; master skip only when exporting masters alone
      includes.masters ? prev : undefined,
    );
  }

  if (includes.masters || includes.purchase || includes.payments) {
    const rawSuppliers = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.tenantId, options.tenantId), eq(suppliers.isActive, true)));
    supplierRows = filterOutExported(
      rawSuppliers.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        gstin: s.gstin,
        pan: s.pan,
        address: s.address,
        email: s.email,
        phone: s.phone,
        kind: "supplier" as const,
      })),
      "supplier",
      reexport || !includes.masters,
      includes.masters ? prev : undefined,
    );
  }

  if (includes.masters || includes.sales) {
    const rawItems = await db
      .select()
      .from(items)
      .where(and(eq(items.tenantId, options.tenantId), eq(items.isActive, true)));
    itemRows = filterOutExported(
      rawItems.map((i) => ({
        id: i.id,
        code: i.code,
        name: i.name,
        hsn: i.hsn,
        uom: i.uom || "PCS",
        gstRate: num(i.gstRate, 18),
        salePrice: num(i.salePrice),
        purchasePrice: num(i.purchasePrice),
      })),
      "item",
      reexport || !includes.masters,
      includes.masters ? prev : undefined,
    );
    units = [...new Set(itemRows.map((i) => i.uom || "PCS"))].sort();
  }

  if (includes.sales) {
    const invHeaders = await db
      .select({
        id: salesInvoices.id,
        number: salesInvoices.number,
        invoiceDate: salesInvoices.invoiceDate,
        customerId: salesInvoices.customerId,
        customerName: customers.name,
        customerGstin: customers.gstin,
        subtotal: salesInvoices.subtotal,
        taxAmount: salesInvoices.taxAmount,
        totalAmount: salesInvoices.totalAmount,
        notes: salesInvoices.notes,
      })
      .from(salesInvoices)
      .innerJoin(customers, eq(salesInvoices.customerId, customers.id))
      .where(
        and(
          eq(salesInvoices.tenantId, options.tenantId),
          gte(salesInvoices.invoiceDate, options.fromDate),
          lte(salesInvoices.invoiceDate, options.toDate),
        ),
      );

    const filtered = filterOutExported(invHeaders, "sales_invoice", reexport, prev);
    const invIds = filtered.map((i) => i.id);
    const lineMap = new Map<string, ExportSalesLine[]>();

    if (invIds.length > 0) {
      const lines = await db
        .select({
          id: salesInvoiceLines.id,
          salesInvoiceId: salesInvoiceLines.salesInvoiceId,
          itemId: salesInvoiceLines.itemId,
          itemCode: items.code,
          itemName: items.name,
          description: salesInvoiceLines.description,
          quantity: salesInvoiceLines.quantity,
          uom: salesInvoiceLines.uom,
          unitPrice: salesInvoiceLines.unitPrice,
          gstRate: salesInvoiceLines.gstRate,
          hsn: salesInvoiceLines.hsn,
          lineTotal: salesInvoiceLines.lineTotal,
        })
        .from(salesInvoiceLines)
        .leftJoin(items, eq(salesInvoiceLines.itemId, items.id))
        .where(inArray(salesInvoiceLines.salesInvoiceId, invIds));

      for (const line of lines) {
        const qty = num(line.quantity);
        const price = num(line.unitPrice);
        const gstRate = num(line.gstRate, 18);
        const taxable = round2(qty * price);
        const { mode } = resolveGstMode(
          companyGstin,
          filtered.find((f) => f.id === line.salesInvoiceId)?.customerGstin,
        );
        const tax = buildTaxBreakdown(taxable, gstRate, mode);
        taxRates.add(gstRate);
        const mapped: ExportSalesLine = {
          id: line.id,
          itemId: line.itemId,
          itemCode: line.itemCode,
          itemName: line.itemName,
          description: line.description,
          quantity: qty,
          uom: line.uom || "PCS",
          unitPrice: price,
          gstRate,
          hsn: line.hsn,
          lineTotal: num(line.lineTotal, taxable),
          taxableAmount: taxable,
          tax,
        };
        const list = lineMap.get(line.salesInvoiceId) || [];
        list.push(mapped);
        lineMap.set(line.salesInvoiceId, list);
      }
    }

    salesRows = filtered.map((inv) => {
      const lines = lineMap.get(inv.id) || [];
      const { mode } = resolveGstMode(companyGstin, inv.customerGstin);
      const subtotal = num(inv.subtotal);
      const taxAmount = num(inv.taxAmount);
      const avgRate =
        lines.length > 0
          ? lines.reduce((s, l) => s + l.gstRate, 0) / lines.length
          : 18;
      taxRates.add(avgRate);
      return {
        id: inv.id,
        number: inv.number,
        invoiceDate: inv.invoiceDate,
        customerId: inv.customerId,
        customerName: inv.customerName,
        customerGstin: inv.customerGstin,
        subtotal,
        taxAmount,
        totalAmount: num(inv.totalAmount),
        notes: inv.notes,
        lines,
        tax: buildTaxBreakdown(subtotal, avgRate, mode, taxAmount),
      };
    });

    // Ensure parties for vouchers are present even if masters toggle skipped export history filter
    if (!includes.masters) {
      const needed = new Set(salesRows.map((s) => s.customerId));
      const missing = await db
        .select()
        .from(customers)
        .where(
          and(eq(customers.tenantId, options.tenantId), inArray(customers.id, [...needed])),
        );
      customerRows = missing.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        gstin: c.gstin,
        pan: c.pan,
        address: c.billingAddress,
        email: c.email,
        phone: c.phone,
        kind: "customer" as const,
      }));
    } else {
      // Merge any customers referenced by invoices
      const byId = new Map(customerRows.map((c) => [c.id, c]));
      for (const inv of salesRows) {
        if (!byId.has(inv.customerId)) {
          const c = await db.query.customers.findFirst({
            where: eq(customers.id, inv.customerId),
          });
          if (c) {
            byId.set(c.id, {
              id: c.id,
              code: c.code,
              name: c.name,
              gstin: c.gstin,
              pan: c.pan,
              address: c.billingAddress,
              email: c.email,
              phone: c.phone,
              kind: "customer",
            });
          }
        }
      }
      customerRows = [...byId.values()];
    }
  }

  if (includes.purchase) {
    const raw = await db
      .select({
        id: purchaseInvoices.id,
        number: purchaseInvoices.number,
        invoiceDate: purchaseInvoices.invoiceDate,
        supplierId: purchaseInvoices.supplierId,
        supplierName: suppliers.name,
        supplierGstin: suppliers.gstin,
        subtotal: purchaseInvoices.subtotal,
        taxAmount: purchaseInvoices.taxAmount,
        totalAmount: purchaseInvoices.totalAmount,
        notes: purchaseInvoices.notes,
      })
      .from(purchaseInvoices)
      .innerJoin(suppliers, eq(purchaseInvoices.supplierId, suppliers.id))
      .where(
        and(
          eq(purchaseInvoices.tenantId, options.tenantId),
          gte(purchaseInvoices.invoiceDate, options.fromDate),
          lte(purchaseInvoices.invoiceDate, options.toDate),
        ),
      );

    purchaseRows = filterOutExported(raw, "purchase_invoice", reexport, prev).map((inv) => {
      const subtotal = num(inv.subtotal);
      const taxAmount = num(inv.taxAmount);
      const gstRate = subtotal > 0 ? round2((taxAmount / subtotal) * 100) : 18;
      const { mode } = resolveGstMode(companyGstin, inv.supplierGstin);
      taxRates.add(gstRate);
      return {
        id: inv.id,
        number: inv.number,
        invoiceDate: inv.invoiceDate,
        supplierId: inv.supplierId,
        supplierName: inv.supplierName,
        supplierGstin: inv.supplierGstin,
        subtotal,
        taxAmount,
        totalAmount: num(inv.totalAmount),
        notes: inv.notes,
        gstRate,
        tax: buildTaxBreakdown(subtotal, gstRate, mode, taxAmount),
      };
    });

    const byId = new Map(supplierRows.map((s) => [s.id, s]));
    for (const inv of purchaseRows) {
      if (!byId.has(inv.supplierId)) {
        const s = await db.query.suppliers.findFirst({
          where: eq(suppliers.id, inv.supplierId),
        });
        if (s) {
          byId.set(s.id, {
            id: s.id,
            code: s.code,
            name: s.name,
            gstin: s.gstin,
            pan: s.pan,
            address: s.address,
            email: s.email,
            phone: s.phone,
            kind: "supplier",
          });
        }
      }
    }
    supplierRows = [...byId.values()];
  }

  if (includes.receipts) {
    const raw = await db
      .select({
        id: receipts.id,
        number: receipts.number,
        receiptDate: receipts.receiptDate,
        customerId: receipts.customerId,
        customerName: customers.name,
        salesInvoiceNumber: salesInvoices.number,
        amount: receipts.amount,
        paymentMode: receipts.paymentMode,
        reference: receipts.reference,
        notes: receipts.notes,
      })
      .from(receipts)
      .innerJoin(customers, eq(receipts.customerId, customers.id))
      .leftJoin(salesInvoices, eq(receipts.salesInvoiceId, salesInvoices.id))
      .where(
        and(
          eq(receipts.tenantId, options.tenantId),
          gte(receipts.receiptDate, options.fromDate),
          lte(receipts.receiptDate, options.toDate),
        ),
      );

    receiptRows = filterOutExported(raw, "receipt", reexport, prev).map((r) => ({
      id: r.id,
      number: r.number,
      receiptDate: r.receiptDate,
      customerId: r.customerId,
      customerName: r.customerName,
      salesInvoiceNumber: r.salesInvoiceNumber,
      amount: num(r.amount),
      paymentMode: r.paymentMode || "bank",
      reference: r.reference,
      notes: r.notes,
    }));
  }

  if (includes.payments) {
    const raw = await db
      .select({
        id: payments.id,
        number: payments.number,
        paymentDate: payments.paymentDate,
        supplierId: payments.supplierId,
        supplierName: suppliers.name,
        purchaseInvoiceNumber: purchaseInvoices.number,
        amount: payments.amount,
        paymentMode: payments.paymentMode,
        reference: payments.reference,
        notes: payments.notes,
      })
      .from(payments)
      .innerJoin(suppliers, eq(payments.supplierId, suppliers.id))
      .leftJoin(purchaseInvoices, eq(payments.purchaseInvoiceId, purchaseInvoices.id))
      .where(
        and(
          eq(payments.tenantId, options.tenantId),
          gte(payments.paymentDate, options.fromDate),
          lte(payments.paymentDate, options.toDate),
        ),
      );

    paymentRows = filterOutExported(raw, "payment", reexport, prev).map((p) => ({
      id: p.id,
      number: p.number,
      paymentDate: p.paymentDate,
      supplierId: p.supplierId,
      supplierName: p.supplierName,
      purchaseInvoiceNumber: p.purchaseInvoiceNumber,
      amount: num(p.amount),
      paymentMode: p.paymentMode || "bank",
      reference: p.reference,
      notes: p.notes,
    }));
  }

  if (includes.expenses) {
    const raw = await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.tenantId, options.tenantId),
          gte(expenses.expenseDate, options.fromDate),
          lte(expenses.expenseDate, options.toDate),
        ),
      );

    expenseRows = filterOutExported(raw, "expense", reexport, prev).map((e) => ({
      id: e.id,
      category: e.category,
      description: e.description,
      amount: num(e.amount),
      expenseDate: e.expenseDate,
    }));
  }

  // When masters included, load all active masters (subject to skip filter already applied)
  if (includes.masters && customerRows.length === 0 && !includes.sales) {
    // already loaded above when masters||sales||receipts
  }

  return {
    company: {
      id: company.id,
      name: company.name,
      legalName: company.legalName,
      gstin: company.gstin,
      state: company.state,
      stateCode,
    },
    fromDate: options.fromDate,
    toDate: options.toDate,
    includes,
    customers: customerRows,
    suppliers: supplierRows,
    items: itemRows,
    units: units.length ? units : [...new Set(itemRows.map((i) => i.uom))],
    salesInvoices: salesRows,
    purchaseInvoices: purchaseRows,
    receipts: receiptRows,
    payments: paymentRows,
    expenses: expenseRows,
    taxRatesUsed: [...taxRates].filter((r) => r > 0).sort((a, b) => a - b),
  };
}

export function countsFromPayload(payload: AccountingExportPayload): ExportCounts {
  return {
    customers: payload.includes.masters ? payload.customers.length : 0,
    suppliers: payload.includes.masters ? payload.suppliers.length : 0,
    items: payload.includes.masters ? payload.items.length : 0,
    units: payload.includes.masters ? payload.units.length : 0,
    salesInvoices: payload.salesInvoices.length,
    purchaseInvoices: payload.purchaseInvoices.length,
    receipts: payload.receipts.length,
    payments: payload.payments.length,
    expenses: payload.expenses.length,
  };
}
