import type { AccountingExportPayload } from "./types";
import { buildMastersXml, buildVouchersXml, buildCombinedXml } from "./xml";
import { buildCsvFiles, TALLY_IMPORT_README } from "./csv";
import { buildZip, type ZipEntry } from "./zip";

export * from "./types";
export * from "./gst";
export * from "./gather";
export * from "./validate";
export * from "./xml";
export * from "./csv";
export * from "./zip";

export function buildExportZip(payload: AccountingExportPayload): Uint8Array {
  const entries: ZipEntry[] = [
    { name: "masters.xml", content: buildMastersXml(payload) },
    { name: "vouchers.xml", content: buildVouchersXml(payload) },
    { name: "tally-import.xml", content: buildCombinedXml(payload) },
    { name: "README.txt", content: TALLY_IMPORT_README },
  ];

  const csvFiles = buildCsvFiles(payload);
  for (const [name, content] of Object.entries(csvFiles)) {
    entries.push({ name, content });
  }

  return buildZip(entries);
}

export function listExportItemRows(payload: AccountingExportPayload): {
  entityType: string;
  entityId: string;
  externalKey: string;
}[] {
  const rows: { entityType: string; entityId: string; externalKey: string }[] = [];

  if (payload.includes.masters) {
    for (const c of payload.customers) {
      rows.push({ entityType: "customer", entityId: c.id, externalKey: c.code });
    }
    for (const s of payload.suppliers) {
      rows.push({ entityType: "supplier", entityId: s.id, externalKey: s.code });
    }
    for (const i of payload.items) {
      rows.push({ entityType: "item", entityId: i.id, externalKey: i.code });
    }
  }
  for (const inv of payload.salesInvoices) {
    rows.push({ entityType: "sales_invoice", entityId: inv.id, externalKey: inv.number });
  }
  for (const inv of payload.purchaseInvoices) {
    rows.push({ entityType: "purchase_invoice", entityId: inv.id, externalKey: inv.number });
  }
  for (const r of payload.receipts) {
    rows.push({ entityType: "receipt", entityId: r.id, externalKey: r.number });
  }
  for (const p of payload.payments) {
    rows.push({ entityType: "payment", entityId: p.id, externalKey: p.number });
  }
  for (const e of payload.expenses) {
    rows.push({ entityType: "expense", entityId: e.id, externalKey: e.category });
  }
  return rows;
}
