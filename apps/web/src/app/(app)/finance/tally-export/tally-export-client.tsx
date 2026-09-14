"use client";

import { useMemo, useState, useTransition } from "react";
import {
  previewTallyExport,
  createTallyExport,
  type TallyPreviewResult,
} from "@/app/actions/tally-export";
import { Badge, Button, Card, Input, Label } from "@/components/ui";

type Includes = {
  masters: boolean;
  sales: boolean;
  purchase: boolean;
  receipts: boolean;
  payments: boolean;
  expenses: boolean;
};

const defaultIncludes: Includes = {
  masters: true,
  sales: true,
  purchase: true,
  receipts: true,
  payments: true,
  expenses: true,
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fyStartISO() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-04-01`;
}

export function TallyExportClient({
  lastExportLabel,
}: {
  lastExportLabel: string | null;
}) {
  const [fromDate, setFromDate] = useState(fyStartISO);
  const [toDate, setToDate] = useState(todayISO);
  const [mode, setMode] = useState<"range" | "since_last">("range");
  const [includes, setIncludes] = useState<Includes>(defaultIncludes);
  const [reexport, setReexport] = useState(false);
  const [preview, setPreview] = useState<TallyPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const includeRows = useMemo(
    () =>
      [
        ["masters", "Masters (customers, suppliers, items)"],
        ["sales", "Sales invoices"],
        ["purchase", "Purchase invoices"],
        ["receipts", "Receipts"],
        ["payments", "Payments"],
        ["expenses", "Expenses"],
      ] as const,
    [],
  );

  function runPreview() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await previewTallyExport({
          fromDate,
          toDate,
          mode,
          includes,
          reexport,
        });
        setPreview(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Preview failed");
      }
    });
  }

  function runExport() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createTallyExport({
          fromDate,
          toDate,
          mode,
          includes,
          reexport,
        });
        const a = document.createElement("a");
        a.href = `/api/tally-export/${result.batchId}`;
        a.download = `tally-export-${result.batchNumber}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Export failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Export mode</Label>
            <select
              className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value as "range" | "since_last")}
            >
              <option value="range">Date range</option>
              <option value="since_last">Since last successful export</option>
            </select>
            {lastExportLabel ? (
              <p className="mt-1 text-xs text-[var(--color-muted)]">Last export: {lastExportLabel}</p>
            ) : (
              <p className="mt-1 text-xs text-[var(--color-muted)]">No prior export yet</p>
            )}
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={reexport}
                onChange={(e) => setReexport(e.target.checked)}
              />
              Re-export already exported records
            </label>
          </div>
          <div>
            <Label>From</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              disabled={mode === "since_last"}
            />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {includeRows.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includes[key]}
                onChange={(e) => setIncludes((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={runPreview}>
            Preview / Validate
          </Button>
          <Button type="button" disabled={pending} onClick={runExport}>
            Export ZIP (XML + CSV)
          </Button>
        </div>
        {error ? <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p> : null}
      </Card>

      {preview ? (
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-primary)]">Preview</h2>
            <Badge>
              {preview.fromDate} → {preview.toDate}
            </Badge>
            <Badge tone="neutral">{preview.mode === "since_last" ? "Since last" : "Range"}</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Customers", preview.counts.customers],
                ["Suppliers", preview.counts.suppliers],
                ["Items", preview.counts.items],
                ["Sales invoices", preview.counts.salesInvoices],
                ["Purchase invoices", preview.counts.purchaseInvoices],
                ["Receipts", preview.counts.receipts],
                ["Payments", preview.counts.payments],
                ["Expenses", preview.counts.expenses],
              ] as const
            ).map(([label, count]) => (
              <div key={label} className="rounded-lg border border-[var(--color-border)] px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</div>
                <div className="text-xl font-semibold">{count}</div>
              </div>
            ))}
          </div>

          {preview.validation.errors.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-[var(--color-danger)]">Errors (block export)</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[var(--color-danger)]">
                {preview.validation.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.validation.warnings.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-amber-700">Warnings</p>
              <ul className="mt-1 max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-amber-800">
                {preview.validation.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--color-muted)]">No validation warnings.</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
