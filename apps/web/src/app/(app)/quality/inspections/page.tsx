import { listQcInspections, postQcResult } from "@/app/actions/manufacturing";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader } from "@/components/ui";
import { formatQty } from "@/lib/utils";

export default async function QualityPage() {
  const rows = await listQcInspections();
  return (
    <div>
      <PageHeader title="Quality inspections" description="Incoming / in-process / final QC" />
      <div className="mb-6 space-y-4">
        {rows
          .filter((r) => r.status === "pending")
          .map((r) => (
            <Card key={r.id}>
              <p className="font-medium text-[var(--color-primary)]">
                {r.number} · {r.stage} · Inspect {formatQty(r.inspectedQuantity)}
              </p>
              <form action={postQcResult} className="mt-3 grid gap-3 sm:grid-cols-4">
                <input type="hidden" name="qcId" value={r.id} />
                <div>
                  <Label>Passed</Label>
                  <Input name="passedQuantity" defaultValue={r.inspectedQuantity || "0"} />
                </div>
                <div>
                  <Label>Rejected</Label>
                  <Input name="rejectedQuantity" defaultValue="0" />
                </div>
                <div>
                  <Label>Inspector</Label>
                  <Input name="inspectorName" defaultValue="QC Lead" />
                </div>
                <div className="flex items-end">
                  <Button type="submit">Post QC → FG stock</Button>
                </div>
              </form>
            </Card>
          ))}
      </div>
      <DataTable
        headers={["Number", "Stage", "Inspected", "Passed", "Rejected", "Result", "Status"]}
        rows={rows.map((r) => [
          r.number,
          r.stage,
          formatQty(r.inspectedQuantity),
          formatQty(r.passedQuantity),
          formatQty(r.rejectedQuantity),
          r.result || "—",
          <Badge key={r.id} tone={r.result === "pass" ? "success" : r.result === "fail" ? "danger" : "neutral"}>
            {r.status}
          </Badge>,
        ])}
      />
    </div>
  );
}
