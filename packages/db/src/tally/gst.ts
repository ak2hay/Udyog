import type { GstSplitMode, TaxBreakdown } from "./types";

export function gstinStateCode(gstin: string | null | undefined): string | null {
  if (!gstin) return null;
  const clean = gstin.trim().toUpperCase();
  if (clean.length < 2) return null;
  const code = clean.slice(0, 2);
  return /^\d{2}$/.test(code) ? code : null;
}

export function resolveGstMode(
  companyGstin: string | null | undefined,
  partyGstin: string | null | undefined,
): { mode: GstSplitMode; missingGstin: boolean } {
  const companyCode = gstinStateCode(companyGstin);
  const partyCode = gstinStateCode(partyGstin);
  if (!companyCode || !partyCode) {
    return { mode: "intra", missingGstin: true };
  }
  return {
    mode: companyCode === partyCode ? "intra" : "inter",
    missingGstin: false,
  };
}

export function buildTaxBreakdown(
  taxableAmount: number,
  gstRate: number,
  mode: GstSplitMode,
  taxAmountOverride?: number,
): TaxBreakdown {
  const rate = Number.isFinite(gstRate) ? gstRate : 0;
  const taxable = round2(taxableAmount);
  const computedTax = taxAmountOverride != null ? round2(taxAmountOverride) : round2((taxable * rate) / 100);

  if (mode === "inter") {
    return {
      mode,
      taxableAmount: taxable,
      gstRate: rate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: computedTax,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: rate,
    };
  }

  const half = round2(computedTax / 2);
  const other = round2(computedTax - half);
  return {
    mode,
    taxableAmount: taxable,
    gstRate: rate,
    cgstAmount: half,
    sgstAmount: other,
    igstAmount: 0,
    cgstRate: rate / 2,
    sgstRate: rate / 2,
    igstRate: 0,
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function num(value: string | number | null | undefined, fallback = 0): number {
  if (value == null || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function cashBankLedger(paymentMode: string | null | undefined): string {
  const mode = (paymentMode || "bank").toLowerCase();
  if (mode === "cash") return "Cash";
  if (mode === "upi") return "UPI";
  return "Bank";
}

export function taxLedgerName(kind: "CGST" | "SGST" | "IGST", rate: number): string {
  const r = Number.isInteger(rate) ? String(rate) : rate.toFixed(2).replace(/\.?0+$/, "");
  return `${kind} @ ${r}%`;
}

export function formatTallyDate(isoDate: string): string {
  // Tally expects YYYYMMDD
  return isoDate.replace(/-/g, "");
}
