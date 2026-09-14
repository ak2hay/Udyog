/**
 * Offline smoke test for Tally XML/CSV/ZIP builders (no DB).
 * Run: pnpm --filter @rkyves/db exec tsx src/tally/smoke.ts
 */
import {
  buildExportZip,
  buildMastersXml,
  buildVouchersXml,
  buildCsvFiles,
  validateExportPayload,
  countsFromPayload,
  type AccountingExportPayload,
} from "./index";

const payload: AccountingExportPayload = {
  company: {
    id: "t1",
    name: "Demo Manufacturing",
    legalName: "Demo Mfg Pvt Ltd",
    gstin: "27AABCU9603R1ZM",
    state: "Maharashtra",
    stateCode: "27",
  },
  fromDate: "2026-04-01",
  toDate: "2026-09-14",
  includes: {
    masters: true,
    sales: true,
    purchase: true,
    receipts: true,
    payments: true,
    expenses: true,
  },
  customers: [
    {
      id: "c1",
      code: "CUST-001",
      name: "ABC Engineering",
      gstin: "27AAAAA0000A1Z5",
      pan: null,
      address: "Pune",
      email: null,
      phone: null,
      kind: "customer",
    },
  ],
  suppliers: [
    {
      id: "s1",
      code: "SUP-001",
      name: "Steel Traders",
      gstin: "29BBBBB0000B1Z5",
      pan: null,
      address: "Bengaluru",
      email: null,
      phone: null,
      kind: "supplier",
    },
  ],
  items: [
    {
      id: "i1",
      code: "FG-001",
      name: "Widget A",
      hsn: "8481",
      uom: "PCS",
      gstRate: 18,
      salePrice: 100,
      purchasePrice: 60,
    },
  ],
  units: ["PCS"],
  salesInvoices: [
    {
      id: "si1",
      number: "SI-2026-0001",
      invoiceDate: "2026-09-01",
      customerId: "c1",
      customerName: "ABC Engineering",
      customerGstin: "27AAAAA0000A1Z5",
      subtotal: 1000,
      taxAmount: 180,
      totalAmount: 1180,
      notes: null,
      lines: [
        {
          id: "sil1",
          itemId: "i1",
          itemCode: "FG-001",
          itemName: "Widget A",
          description: "Widget A",
          quantity: 10,
          uom: "PCS",
          unitPrice: 100,
          gstRate: 18,
          hsn: "8481",
          lineTotal: 1180,
          taxableAmount: 1000,
          tax: {
            mode: "intra",
            taxableAmount: 1000,
            gstRate: 18,
            cgstAmount: 90,
            sgstAmount: 90,
            igstAmount: 0,
            cgstRate: 9,
            sgstRate: 9,
            igstRate: 0,
          },
        },
      ],
      tax: {
        mode: "intra",
        taxableAmount: 1000,
        gstRate: 18,
        cgstAmount: 90,
        sgstAmount: 90,
        igstAmount: 0,
        cgstRate: 9,
        sgstRate: 9,
        igstRate: 0,
      },
    },
  ],
  purchaseInvoices: [
    {
      id: "pi1",
      number: "PI-2026-0001",
      invoiceDate: "2026-09-02",
      supplierId: "s1",
      supplierName: "Steel Traders",
      supplierGstin: "29BBBBB0000B1Z5",
      subtotal: 500,
      taxAmount: 90,
      totalAmount: 590,
      notes: null,
      gstRate: 18,
      tax: {
        mode: "inter",
        taxableAmount: 500,
        gstRate: 18,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 90,
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 18,
      },
    },
  ],
  receipts: [
    {
      id: "r1",
      number: "RCT-2026-0001",
      receiptDate: "2026-09-05",
      customerId: "c1",
      customerName: "ABC Engineering",
      salesInvoiceNumber: "SI-2026-0001",
      amount: 500,
      paymentMode: "bank",
      reference: "NEFT1",
      notes: null,
    },
  ],
  payments: [
    {
      id: "p1",
      number: "PAY-2026-0001",
      paymentDate: "2026-09-06",
      supplierId: "s1",
      supplierName: "Steel Traders",
      purchaseInvoiceNumber: "PI-2026-0001",
      amount: 590,
      paymentMode: "upi",
      reference: null,
      notes: null,
    },
  ],
  expenses: [
    {
      id: "e1",
      category: "Office Supplies",
      description: "Stationery",
      amount: 1200,
      expenseDate: "2026-09-07",
    },
  ],
  taxRatesUsed: [18],
};

const validation = validateExportPayload(payload);
const counts = countsFromPayload(payload);
const masters = buildMastersXml(payload);
const vouchers = buildVouchersXml(payload);
const csv = buildCsvFiles(payload);
const zip = buildExportZip(payload);

const checks = [
  masters.includes("<ENVELOPE>"),
  masters.includes("ABC Engineering"),
  masters.includes("CGST @ 9%"),
  vouchers.includes("SI-2026-0001"),
  vouchers.includes("IGST @ 18%"),
  vouchers.includes("RCT-2026-0001"),
  Boolean(csv["sales_invoices.csv"]),
  Boolean(csv["customers.csv"]),
  zip.length > 100,
  zip[0] === 0x50 && zip[1] === 0x4b, // PK
  validation.errors.length === 0,
  counts.salesInvoices === 1,
];

if (checks.every(Boolean)) {
  console.log("tally smoke OK", {
    counts,
    warnings: validation.warnings.length,
    zipBytes: zip.length,
    csvFiles: Object.keys(csv),
  });
  process.exit(0);
}

console.error("tally smoke FAILED", { checks, validation, counts });
process.exit(1);
