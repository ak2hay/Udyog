import Link from "next/link";
import { notFound } from "next/navigation";
import { getBom } from "@/app/actions/manufacturing";
import { Badge, Card, DataTable, PageHeader } from "@/components/ui";

export default async function BomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bom = await getBom(id);
  if (!bom) notFound();

  return (
    <div>
      <PageHeader
        title={`BOM ${bom.item?.code || ""} Rev ${bom.revision}`}
        description={bom.item?.name || bom.itemId}
        actions={
          <Link href="/manufacturing/bom" className="text-sm text-[var(--color-accent)] underline">
            Back to list
          </Link>
        }
      />
      <Card className="mb-6 grid gap-2 sm:grid-cols-4 text-sm">
        <div>
          <p className="text-[var(--color-muted)]">Quantity</p>
          <p className="font-medium">{bom.quantity}</p>
        </div>
        <div>
          <p className="text-[var(--color-muted)]">Scrap %</p>
          <p className="font-medium">{bom.scrapPercent}</p>
        </div>
        <div>
          <p className="text-[var(--color-muted)]">Status</p>
          <Badge tone="success">{bom.status}</Badge>
        </div>
        <div>
          <p className="text-[var(--color-muted)]">Notes</p>
          <p className="font-medium">{bom.notes || "—"}</p>
        </div>
      </Card>
      <DataTable
        headers={["#", "Component", "Qty", "UOM", "Scrap %"]}
        rows={bom.lines.map((l) => [
          l.sequence,
          l.component ? `${l.component.code} — ${l.component.name}` : l.componentItemId,
          l.quantity,
          l.uom,
          l.scrapPercent,
        ])}
      />
    </div>
  );
}
