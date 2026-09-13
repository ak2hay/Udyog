export const DOCUMENT_PREFIXES = {
  enquiry: "ENQ",
  quotation: "QT",
  salesOrder: "SO",
  purchaseRequest: "PR",
  purchaseOrder: "PO",
  grn: "GRN",
  productionOrder: "MO",
  jobCard: "JC",
  qc: "QC",
  deliveryChallan: "DC",
  salesInvoice: "SI",
  purchaseInvoice: "PI",
  receipt: "RCT",
  payment: "PAY",
  stockAdjustment: "ADJ",
  materialIssue: "MI",
} as const;

export type DocumentType = keyof typeof DOCUMENT_PREFIXES;

export const DOCUMENT_STATUSES = [
  "draft",
  "confirmed",
  "in_progress",
  "completed",
  "posted",
  "cancelled",
  "rejected",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const ITEM_TYPES = [
  "raw_material",
  "wip",
  "finished_good",
  "consumable",
  "tool",
  "spare_part",
  "scrap",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const INDUSTRIES = ["manufacturing", "retail", "restaurant", "distribution", "services"] as const;
export type Industry = (typeof INDUSTRIES)[number];
