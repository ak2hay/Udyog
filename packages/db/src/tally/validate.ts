import { resolveGstMode } from "./gst";
import type { AccountingExportPayload, ValidationResult } from "./types";

export function validateExportPayload(payload: AccountingExportPayload): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!payload.company.name?.trim()) {
    errors.push("Company name is required before exporting to Tally.");
  }

  if (!payload.company.gstin?.trim()) {
    warnings.push("Company GSTIN is missing — tax will default to CGST+SGST (intrastate).");
  }

  for (const c of payload.customers) {
    if (!c.gstin?.trim()) {
      warnings.push(`Customer "${c.name}" has no GSTIN.`);
    }
  }

  for (const s of payload.suppliers) {
    if (!s.gstin?.trim()) {
      warnings.push(`Supplier "${s.name}" has no GSTIN.`);
    }
  }

  for (const inv of payload.salesInvoices) {
    if (inv.totalAmount <= 0) {
      warnings.push(`Sales invoice ${inv.number} has zero amount.`);
    }
    if (!inv.lines.length) {
      warnings.push(`Sales invoice ${inv.number} has no lines.`);
    }
    const { missingGstin } = resolveGstMode(payload.company.gstin, inv.customerGstin);
    if (missingGstin) {
      warnings.push(
        `Sales invoice ${inv.number}: missing GSTIN — treated as intrastate (CGST+SGST).`,
      );
    }
  }

  if (payload.purchaseInvoices.length > 0) {
    warnings.push(
      "Purchase invoices have no line items in Rkyves — each is exported as a single taxable amount + tax.",
    );
  }
  for (const inv of payload.purchaseInvoices) {
    if (inv.totalAmount <= 0) {
      warnings.push(`Purchase invoice ${inv.number} has zero amount.`);
    }
    const { missingGstin } = resolveGstMode(payload.company.gstin, inv.supplierGstin);
    if (missingGstin) {
      warnings.push(
        `Purchase invoice ${inv.number}: missing GSTIN — treated as intrastate (CGST+SGST).`,
      );
    }
  }

  for (const r of payload.receipts) {
    if (r.amount <= 0) warnings.push(`Receipt ${r.number} has zero amount.`);
  }
  for (const p of payload.payments) {
    if (p.amount <= 0) warnings.push(`Payment ${p.number} has zero amount.`);
  }
  for (const e of payload.expenses) {
    if (e.amount <= 0) warnings.push(`Expense "${e.description}" has zero amount.`);
  }

  const totalTx =
    payload.salesInvoices.length +
    payload.purchaseInvoices.length +
    payload.receipts.length +
    payload.payments.length +
    payload.expenses.length;
  const totalMasters =
    (payload.includes.masters ? payload.customers.length + payload.suppliers.length + payload.items.length : 0);

  if (totalTx === 0 && totalMasters === 0) {
    warnings.push("Nothing to export for the selected period and filters.");
  }

  // Deduplicate warnings while preserving order
  return {
    errors,
    warnings: [...new Set(warnings)],
  };
}
