import {
  cashBankLedger,
  formatTallyDate,
  taxLedgerName,
} from "./gst";
import type { AccountingExportPayload, TaxBreakdown } from "./types";

function esc(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ledgerMessage(
  name: string,
  parent: string,
  opts?: { gstin?: string | null; isRevenue?: boolean },
): string {
  const gstinXml = opts?.gstin
    ? `<LEDGSTREGDETAILS.LIST>
      <APPLICABLEFROM>20200401</APPLICABLEFROM>
      <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
      <PLACEOFSUPPLY>${esc(opts.gstin.slice(0, 2))}</PLACEOFSUPPLY>
      <GSTINNUMBER>${esc(opts.gstin)}</GSTINNUMBER>
    </LEDGSTREGDETAILS.LIST>`
    : "";

  return `<TALLYMESSAGE xmlns:UDF="TallyUDF">
  <LEDGER NAME="${esc(name)}" RESERVEDNAME="">
    <NAME>${esc(name)}</NAME>
    <PARENT>${esc(parent)}</PARENT>
    <ISBILLWISEON>${opts?.isRevenue ? "No" : "Yes"}</ISBILLWISEON>
    ${gstinXml}
    <LANGUAGENAME.LIST>
      <NAME.LIST TYPE="String">
        <NAME>${esc(name)}</NAME>
      </NAME.LIST>
    </LANGUAGENAME.LIST>
  </LEDGER>
</TALLYMESSAGE>`;
}

function unitMessage(uom: string): string {
  return `<TALLYMESSAGE xmlns:UDF="TallyUDF">
  <UNIT NAME="${esc(uom)}" RESERVEDNAME="">
    <NAME>${esc(uom)}</NAME>
    <ISSIMPLEUNIT>Yes</ISSIMPLEUNIT>
  </UNIT>
</TALLYMESSAGE>`;
}

function stockItemMessage(
  name: string,
  uom: string,
  hsn: string | null,
  gstRate: number,
): string {
  const hsnXml = hsn
    ? `<GSTDETAILS.LIST>
      <APPLICABLEFROM>20200401</APPLICABLEFROM>
      <HSNCODE>${esc(hsn)}</HSNCODE>
      <TAXABILITY>Taxable</TAXABILITY>
      <GSTNATUREOFTRANSACTION>Sales Taxable</GSTNATUREOFTRANSACTION>
      <STATEWISEDETAILS.LIST>
        <STATENAME>&#4; Any</STATENAME>
        <RATEDETAILS.LIST>
          <GSTRATEDUTYHEAD>IGST</GSTRATEDUTYHEAD>
          <GSTRATE>${gstRate}</GSTRATE>
        </RATEDETAILS.LIST>
      </STATEWISEDETAILS.LIST>
    </GSTDETAILS.LIST>`
    : "";

  return `<TALLYMESSAGE xmlns:UDF="TallyUDF">
  <STOCKITEM NAME="${esc(name)}" RESERVEDNAME="">
    <NAME>${esc(name)}</NAME>
    <BASEUNITS>${esc(uom)}</BASEUNITS>
    ${hsnXml}
    <LANGUAGENAME.LIST>
      <NAME.LIST TYPE="String">
        <NAME>${esc(name)}</NAME>
      </NAME.LIST>
    </LANGUAGENAME.LIST>
  </STOCKITEM>
</TALLYMESSAGE>`;
}

function wrapEnvelope(messages: string[], reportName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>${reportName}</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
${messages.join("\n")}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
`;
}

function amountEntry(
  ledger: string,
  amount: number,
  isDeemedPositive: boolean,
  opts?: { isParty?: boolean },
): string {
  const signed = isDeemedPositive ? -Math.abs(amount) : Math.abs(amount);
  // Tally convention: ISDEEMEDPOSITIVE Yes => amount usually negative in XML for debit
  // Use signed amount matching isDeemedPositive flag
  const amt = isDeemedPositive ? -Math.abs(amount) : Math.abs(amount);
  void signed;
  return `<ALLLEDGERENTRIES.LIST>
  <LEDGERNAME>${esc(ledger)}</LEDGERNAME>
  <ISDEEMEDPOSITIVE>${isDeemedPositive ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
  <AMOUNT>${amt.toFixed(2)}</AMOUNT>
  ${opts?.isParty ? "<ISPARTYLEDGER>Yes</ISPARTYLEDGER>" : ""}
</ALLLEDGERENTRIES.LIST>`;
}

function inventoryEntry(
  itemName: string,
  qty: number,
  uom: string,
  rate: number,
  amount: number,
): string {
  return `<ALLINVENTORYENTRIES.LIST>
  <STOCKITEMNAME>${esc(itemName)}</STOCKITEMNAME>
  <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
  <RATE>${rate.toFixed(2)}/${esc(uom)}</RATE>
  <AMOUNT>${amount.toFixed(2)}</AMOUNT>
  <ACTUALQTY>${qty} ${esc(uom)}</ACTUALQTY>
  <BILLEDQTY>${qty} ${esc(uom)}</BILLEDQTY>
</ALLINVENTORYENTRIES.LIST>`;
}

function salesTaxEntries(tax: TaxBreakdown): string {
  const parts: string[] = [];
  if (tax.mode === "inter") {
    if (tax.igstAmount > 0) {
      parts.push(amountEntry(taxLedgerName("IGST", tax.igstRate || tax.gstRate), tax.igstAmount, false));
    }
  } else {
    if (tax.cgstAmount > 0) {
      parts.push(amountEntry(taxLedgerName("CGST", tax.cgstRate || tax.gstRate / 2), tax.cgstAmount, false));
    }
    if (tax.sgstAmount > 0) {
      parts.push(amountEntry(taxLedgerName("SGST", tax.sgstRate || tax.gstRate / 2), tax.sgstAmount, false));
    }
  }
  return parts.join("\n");
}

function purchaseTaxEntries(tax: TaxBreakdown): string {
  const parts: string[] = [];
  if (tax.mode === "inter") {
    if (tax.igstAmount > 0) {
      parts.push(amountEntry(taxLedgerName("IGST", tax.igstRate || tax.gstRate), tax.igstAmount, true));
    }
  } else {
    if (tax.cgstAmount > 0) {
      parts.push(amountEntry(taxLedgerName("CGST", tax.cgstRate || tax.gstRate / 2), tax.cgstAmount, true));
    }
    if (tax.sgstAmount > 0) {
      parts.push(amountEntry(taxLedgerName("SGST", tax.sgstRate || tax.gstRate / 2), tax.sgstAmount, true));
    }
  }
  return parts.join("\n");
}

export function buildMastersXml(payload: AccountingExportPayload): string {
  const messages: string[] = [];

  messages.push(ledgerMessage("Sales", "Sales Accounts", { isRevenue: true }));
  messages.push(ledgerMessage("Purchase", "Purchase Accounts", { isRevenue: true }));
  messages.push(ledgerMessage("Bank", "Bank Accounts"));
  messages.push(ledgerMessage("Cash", "Cash-in-Hand"));
  messages.push(ledgerMessage("UPI", "Bank Accounts"));

  for (const rate of payload.taxRatesUsed) {
    const half = rate / 2;
    messages.push(ledgerMessage(taxLedgerName("CGST", half), "Duties & Taxes", { isRevenue: true }));
    messages.push(ledgerMessage(taxLedgerName("SGST", half), "Duties & Taxes", { isRevenue: true }));
    messages.push(ledgerMessage(taxLedgerName("IGST", rate), "Duties & Taxes", { isRevenue: true }));
  }

  if (payload.includes.masters) {
    for (const u of payload.units) {
      messages.push(unitMessage(u));
    }
    for (const c of payload.customers) {
      messages.push(ledgerMessage(c.name, "Sundry Debtors", { gstin: c.gstin }));
    }
    for (const s of payload.suppliers) {
      messages.push(ledgerMessage(s.name, "Sundry Creditors", { gstin: s.gstin }));
    }
    for (const item of payload.items) {
      messages.push(stockItemMessage(item.name, item.uom, item.hsn, item.gstRate));
    }
  } else {
    const custNames = new Set<string>();
    for (const inv of payload.salesInvoices) custNames.add(inv.customerName);
    for (const r of payload.receipts) custNames.add(r.customerName);
    for (const name of custNames) {
      const c = payload.customers.find((x) => x.name === name);
      messages.push(ledgerMessage(name, "Sundry Debtors", { gstin: c?.gstin }));
    }
    const suppNames = new Set<string>();
    for (const inv of payload.purchaseInvoices) suppNames.add(inv.supplierName);
    for (const p of payload.payments) suppNames.add(p.supplierName);
    for (const name of suppNames) {
      const s = payload.suppliers.find((x) => x.name === name);
      messages.push(ledgerMessage(name, "Sundry Creditors", { gstin: s?.gstin }));
    }
  }

  const categories = new Set(payload.expenses.map((e) => e.category || "Expenses"));
  for (const cat of categories) {
    messages.push(ledgerMessage(cat, "Indirect Expenses", { isRevenue: true }));
  }

  return wrapEnvelope(messages, "All Masters");
}

export function buildVouchersXml(payload: AccountingExportPayload): string {
  const messages: string[] = [];

  for (const inv of payload.salesInvoices) {
    const invEntries = inv.lines
      .map((line) => {
        const name = line.itemName || line.description;
        return inventoryEntry(name, line.quantity, line.uom, line.unitPrice, line.taxableAmount);
      })
      .join("\n");

    messages.push(`<TALLYMESSAGE xmlns:UDF="TallyUDF">
  <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
    <DATE>${formatTallyDate(inv.invoiceDate)}</DATE>
    <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
    <VOUCHERNUMBER>${esc(inv.number)}</VOUCHERNUMBER>
    <REFERENCE>${esc(inv.number)}</REFERENCE>
    <PARTYLEDGERNAME>${esc(inv.customerName)}</PARTYLEDGERNAME>
    <NARRATION>${esc(inv.notes || `Sales invoice ${inv.number}`)}</NARRATION>
    <EFFECTIVEDATE>${formatTallyDate(inv.invoiceDate)}</EFFECTIVEDATE>
    <ISINVOICE>Yes</ISINVOICE>
    ${amountEntry(inv.customerName, inv.totalAmount, true, { isParty: true })}
    ${amountEntry("Sales", inv.subtotal, false)}
    ${salesTaxEntries(inv.tax)}
    ${invEntries}
  </VOUCHER>
</TALLYMESSAGE>`);
  }

  for (const inv of payload.purchaseInvoices) {
    messages.push(`<TALLYMESSAGE xmlns:UDF="TallyUDF">
  <VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Accounting Voucher View">
    <DATE>${formatTallyDate(inv.invoiceDate)}</DATE>
    <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
    <VOUCHERNUMBER>${esc(inv.number)}</VOUCHERNUMBER>
    <REFERENCE>${esc(inv.number)}</REFERENCE>
    <PARTYLEDGERNAME>${esc(inv.supplierName)}</PARTYLEDGERNAME>
    <NARRATION>${esc(inv.notes || `Purchase invoice ${inv.number}`)}</NARRATION>
    <EFFECTIVEDATE>${formatTallyDate(inv.invoiceDate)}</EFFECTIVEDATE>
    ${amountEntry(inv.supplierName, inv.totalAmount, false, { isParty: true })}
    ${amountEntry("Purchase", inv.subtotal, true)}
    ${purchaseTaxEntries(inv.tax)}
  </VOUCHER>
</TALLYMESSAGE>`);
  }

  for (const r of payload.receipts) {
    const bank = cashBankLedger(r.paymentMode);
    messages.push(`<TALLYMESSAGE xmlns:UDF="TallyUDF">
  <VOUCHER VCHTYPE="Receipt" ACTION="Create">
    <DATE>${formatTallyDate(r.receiptDate)}</DATE>
    <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
    <VOUCHERNUMBER>${esc(r.number)}</VOUCHERNUMBER>
    <PARTYLEDGERNAME>${esc(r.customerName)}</PARTYLEDGERNAME>
    <NARRATION>${esc(r.notes || r.reference || `Receipt ${r.number}${r.salesInvoiceNumber ? ` against ${r.salesInvoiceNumber}` : ""}`)}</NARRATION>
    <EFFECTIVEDATE>${formatTallyDate(r.receiptDate)}</EFFECTIVEDATE>
    ${amountEntry(bank, r.amount, true)}
    ${amountEntry(r.customerName, r.amount, false, { isParty: true })}
  </VOUCHER>
</TALLYMESSAGE>`);
  }

  for (const p of payload.payments) {
    const bank = cashBankLedger(p.paymentMode);
    messages.push(`<TALLYMESSAGE xmlns:UDF="TallyUDF">
  <VOUCHER VCHTYPE="Payment" ACTION="Create">
    <DATE>${formatTallyDate(p.paymentDate)}</DATE>
    <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
    <VOUCHERNUMBER>${esc(p.number)}</VOUCHERNUMBER>
    <PARTYLEDGERNAME>${esc(p.supplierName)}</PARTYLEDGERNAME>
    <NARRATION>${esc(p.notes || p.reference || `Payment ${p.number}${p.purchaseInvoiceNumber ? ` against ${p.purchaseInvoiceNumber}` : ""}`)}</NARRATION>
    <EFFECTIVEDATE>${formatTallyDate(p.paymentDate)}</EFFECTIVEDATE>
    ${amountEntry(p.supplierName, p.amount, true, { isParty: true })}
    ${amountEntry(bank, p.amount, false)}
  </VOUCHER>
</TALLYMESSAGE>`);
  }

  for (const e of payload.expenses) {
    const vchNo = `EXP-${e.expenseDate.replace(/-/g, "")}-${e.id.slice(0, 8)}`;
    messages.push(`<TALLYMESSAGE xmlns:UDF="TallyUDF">
  <VOUCHER VCHTYPE="Payment" ACTION="Create">
    <DATE>${formatTallyDate(e.expenseDate)}</DATE>
    <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
    <VOUCHERNUMBER>${esc(vchNo)}</VOUCHERNUMBER>
    <NARRATION>${esc(e.description)}</NARRATION>
    <EFFECTIVEDATE>${formatTallyDate(e.expenseDate)}</EFFECTIVEDATE>
    ${amountEntry(e.category || "Expenses", e.amount, true)}
    ${amountEntry("Cash", e.amount, false)}
  </VOUCHER>
</TALLYMESSAGE>`);
  }

  return wrapEnvelope(messages, "Vouchers");
}

export function buildCombinedXml(payload: AccountingExportPayload): string {
  const masters = buildMastersXml(payload);
  const vouchers = buildVouchersXml(payload);
  const masterMsgs = [...masters.matchAll(/<TALLYMESSAGE[\s\S]*?<\/TALLYMESSAGE>/g)].map((m) => m[0]);
  const voucherMsgs = [...vouchers.matchAll(/<TALLYMESSAGE[\s\S]*?<\/TALLYMESSAGE>/g)].map((m) => m[0]);
  return wrapEnvelope([...masterMsgs, ...voucherMsgs], "All Masters");
}
