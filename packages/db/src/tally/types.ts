import type { TallyExportIncludes } from "../schema/tally";

export type GstSplitMode = "intra" | "inter";

export type TaxBreakdown = {
  mode: GstSplitMode;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
};

export type ExportParty = {
  id: string;
  code: string;
  name: string;
  gstin: string | null;
  pan: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  kind: "customer" | "supplier";
};

export type ExportItem = {
  id: string;
  code: string;
  name: string;
  hsn: string | null;
  uom: string;
  gstRate: number;
  salePrice: number;
  purchasePrice: number;
};

export type ExportSalesLine = {
  id: string;
  itemId: string | null;
  itemCode: string | null;
  itemName: string | null;
  description: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  gstRate: number;
  hsn: string | null;
  lineTotal: number;
  taxableAmount: number;
  tax: TaxBreakdown;
};

export type ExportSalesInvoice = {
  id: string;
  number: string;
  invoiceDate: string;
  customerId: string;
  customerName: string;
  customerGstin: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  lines: ExportSalesLine[];
  tax: TaxBreakdown;
};

export type ExportPurchaseInvoice = {
  id: string;
  number: string;
  invoiceDate: string;
  supplierId: string;
  supplierName: string;
  supplierGstin: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  /** Assumed GST rate when only header tax exists */
  gstRate: number;
  tax: TaxBreakdown;
};

export type ExportReceipt = {
  id: string;
  number: string;
  receiptDate: string;
  customerId: string;
  customerName: string;
  salesInvoiceNumber: string | null;
  amount: number;
  paymentMode: string;
  reference: string | null;
  notes: string | null;
};

export type ExportPayment = {
  id: string;
  number: string;
  paymentDate: string;
  supplierId: string;
  supplierName: string;
  purchaseInvoiceNumber: string | null;
  amount: number;
  paymentMode: string;
  reference: string | null;
  notes: string | null;
};

export type ExportExpense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
};

export type AccountingExportPayload = {
  company: {
    id: string;
    name: string;
    legalName: string | null;
    gstin: string | null;
    state: string | null;
    stateCode: string | null;
  };
  fromDate: string;
  toDate: string;
  includes: TallyExportIncludes;
  customers: ExportParty[];
  suppliers: ExportParty[];
  items: ExportItem[];
  units: string[];
  salesInvoices: ExportSalesInvoice[];
  purchaseInvoices: ExportPurchaseInvoice[];
  receipts: ExportReceipt[];
  payments: ExportPayment[];
  expenses: ExportExpense[];
  taxRatesUsed: number[];
};

export type ValidationResult = {
  errors: string[];
  warnings: string[];
};

export type ExportCounts = {
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

export const DEFAULT_INCLUDES: TallyExportIncludes = {
  masters: true,
  sales: true,
  purchase: true,
  receipts: true,
  payments: true,
  expenses: true,
};
