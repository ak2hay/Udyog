import { listTallyExportBatches, getLastTallyExport } from "@/app/actions/tally-export";
import { Badge, Card, DataTable, PageHeader } from "@/components/ui";
import { TallyExportClient } from "./tally-export-client";

export default async function TallyExportPage() {
  const [batches, last] = await Promise.all([listTallyExportBatches(), getLastTallyExport()]);
  const lastLabel = last?.exportedAt
    ? `${last.batchNumber} · ${last.exportedAt.toISOString().slice(0, 16).replace("T", " ")} UTC`
    : null;

  return (
    <div>
      <PageHeader
        title="Tally Export"
        description="Export masters and transactions as Tally XML + CSV for your CA"
      />
      <TallyExportClient lastExportLabel={lastLabel} />

      <div className="mt-8">
        <PageHeader title="Export history" />
        <Card>
          {batches.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No exports yet.</p>
          ) : (
            <DataTable
              headers={["Batch", "Period", "Mode", "Status", "Counts", "Download"]}
              rows={batches.map((b) => {
                const c = b.counts;
                const summary = c
                  ? `SI ${c.salesInvoices} · PI ${c.purchaseInvoices} · RCT ${c.receipts} · PAY ${c.payments}`
                  : "—";
                return [
                  b.batchNumber,
                  `${b.fromDate} → ${b.toDate}`,
                  <Badge key={`${b.id}-mode`}>{b.mode}</Badge>,
                  <Badge
                    key={`${b.id}-status`}
                    tone={b.status === "exported" ? "success" : b.status === "failed" ? "danger" : "neutral"}
                  >
                    {b.status}
                  </Badge>,
                  summary,
                  b.status === "exported" ? (
                    <a
                      key={`${b.id}-dl`}
                      className="text-sm font-medium text-[var(--color-primary)] underline"
                      href={`/api/tally-export/${b.id}`}
                    >
                      Download ZIP
                    </a>
                  ) : (
                    "—"
                  ),
                ];
              })}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
