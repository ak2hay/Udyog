import type { AccountingExportPayload } from "./types";

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\n") + "\n";
}

export type CsvFiles = Record<string, string>;

export function buildCsvFiles(payload: AccountingExportPayload): CsvFiles {
  const files: CsvFiles = {};

  if (payload.includes.masters) {
    files["customers.csv"] = toCsv(
      ["code", "name", "gstin", "pan", "address", "email", "phone"],
      payload.customers.map((c) => [c.code, c.name, c.gstin, c.pan, c.address, c.email, c.phone]),
    );
    files["suppliers.csv"] = toCsv(
      ["code", "name", "gstin", "pan", "address", "email", "phone"],
      payload.suppliers.map((s) => [s.code, s.name, s.gstin, s.pan, s.address, s.email, s.phone]),
    );
    files["items.csv"] = toCsv(
      ["code", "name", "hsn", "uom", "gst_rate", "sale_price", "purchase_price"],
      payload.items.map((i) => [
        i.code,
        i.name,
        i.hsn,
        i.uom,
        i.gstRate,
        i.salePrice,
        i.purchasePrice,
      ]),
    );
  }

  if (payload.salesInvoices.length) {
    files["sales_invoices.csv"] = toCsv(
      [
        "number",
        "date",
        "customer",
        "customer_gstin",
        "subtotal",
        "tax_amount",
        "total",
        "gst_mode",
        "cgst",
        "sgst",
        "igst",
      ],
      payload.salesInvoices.map((i) => [
        i.number,
        i.invoiceDate,
        i.customerName,
        i.customerGstin,
        i.subtotal,
        i.taxAmount,
        i.totalAmount,
        i.tax.mode,
        i.tax.cgstAmount,
        i.tax.sgstAmount,
        i.tax.igstAmount,
      ]),
    );
    files["sales_invoice_lines.csv"] = toCsv(
      [
        "invoice_number",
        "item_code",
        "description",
        "qty",
        "uom",
        "unit_price",
        "gst_rate",
        "hsn",
        "taxable",
        "line_total",
      ],
      payload.salesInvoices.flatMap((inv) =>
        inv.lines.map((l) => [
          inv.number,
          l.itemCode,
          l.description,
          l.quantity,
          l.uom,
          l.unitPrice,
          l.gstRate,
          l.hsn,
          l.taxableAmount,
          l.lineTotal,
        ]),
      ),
    );
  }

  if (payload.purchaseInvoices.length) {
    files["purchase_invoices.csv"] = toCsv(
      [
        "number",
        "date",
        "supplier",
        "supplier_gstin",
        "subtotal",
        "tax_amount",
        "total",
        "gst_rate",
        "gst_mode",
        "cgst",
        "sgst",
        "igst",
      ],
      payload.purchaseInvoices.map((i) => [
        i.number,
        i.invoiceDate,
        i.supplierName,
        i.supplierGstin,
        i.subtotal,
        i.taxAmount,
        i.totalAmount,
        i.gstRate,
        i.tax.mode,
        i.tax.cgstAmount,
        i.tax.sgstAmount,
        i.tax.igstAmount,
      ]),
    );
  }

  if (payload.receipts.length) {
    files["receipts.csv"] = toCsv(
      ["number", "date", "customer", "invoice", "amount", "mode", "reference"],
      payload.receipts.map((r) => [
        r.number,
        r.receiptDate,
        r.customerName,
        r.salesInvoiceNumber,
        r.amount,
        r.paymentMode,
        r.reference,
      ]),
    );
  }

  if (payload.payments.length) {
    files["payments.csv"] = toCsv(
      ["number", "date", "supplier", "invoice", "amount", "mode", "reference"],
      payload.payments.map((p) => [
        p.number,
        p.paymentDate,
        p.supplierName,
        p.purchaseInvoiceNumber,
        p.amount,
        p.paymentMode,
        p.reference,
      ]),
    );
  }

  if (payload.expenses.length) {
    files["expenses.csv"] = toCsv(
      ["date", "category", "description", "amount"],
      payload.expenses.map((e) => [e.expenseDate, e.category, e.description, e.amount]),
    );
  }

  return files;
}

export const TALLY_IMPORT_README = `Rkyves → Tally Export
======================

This ZIP contains TallyPrime / Tally.ERP 9 compatible XML plus CSV review files.

How to import into TallyPrime
-----------------------------
1. Open your company in TallyPrime.
2. Go to: Import > Import Data (or Gateway of Tally > Import Data).
3. First import masters.xml (ledgers, stock items, units, tax ledgers).
4. Then import vouchers.xml (sales, purchase, receipts, payments, expenses).
   Or import tally-import.xml once for a combined file.
5. Review any exceptions Tally reports (duplicate ledgers are usually skipped).

CSV files
---------
Use the CSV files to review amounts with your CA before/after import.
They are not for direct Tally CSV import.

GST notes
---------
Interstate vs intrastate is derived from GSTIN state codes (first 2 digits).
If GSTIN is missing, tax is split as CGST+SGST (intrastate) and flagged in validation warnings.

Purchase invoices
-----------------
Rkyves stores purchase invoices as header totals only; each is exported as one taxable amount + tax.
`;
