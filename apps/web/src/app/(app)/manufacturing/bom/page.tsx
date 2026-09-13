import Link from "next/link";
import { createBom, listAllItemsForBom, listBoms } from "@/app/actions/manufacturing";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader, Select } from "@/components/ui";

export default async function BomPage() {
  const [boms, allItems] = await Promise.all([listBoms(), listAllItemsForBom()]);
  const finished = allItems.filter((i) => i.itemType === "finished_good");
  const components = allItems;

  return (
    <div>
      <PageHeader
        title="Bill of Materials"
        description="Create and manage multi-level BOM masters for finished goods"
      />
      <Card className="mb-8">
        <form action={createBom} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Finished good</Label>
              <Select name="itemId" required defaultValue="">
                <option value="" disabled>
                  Select item
                </option>
                {finished.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.code} — {i.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Revision</Label>
              <Input name="revision" defaultValue="A" />
            </div>
            <div>
              <Label>Header qty</Label>
              <Input name="quantity" type="number" step="0.001" defaultValue="1" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Label>Component 1</Label>
              <Select name="componentItemId" required defaultValue="">
                <option value="" disabled>
                  Select component
                </option>
                {components.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.code} — {i.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Qty</Label>
              <Input name="componentQty" type="number" step="0.0001" defaultValue="1" required />
            </div>
            <div>
              <Label>UOM</Label>
              <Input name="componentUom" defaultValue="PCS" />
            </div>
            <input type="hidden" name="componentScrap" value="0" />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Label>Component 2 (optional)</Label>
              <Select name="componentItemId" defaultValue="">
                <option value="">None</option>
                {components.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.code} — {i.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Qty</Label>
              <Input name="componentQty" type="number" step="0.0001" defaultValue="1" />
            </div>
            <div>
              <Label>UOM</Label>
              <Input name="componentUom" defaultValue="PCS" />
            </div>
            <input type="hidden" name="componentScrap" value="0" />
          </div>
          <div>
            <Label>Notes</Label>
            <Input name="notes" />
          </div>
          <div>
            <Label>Scrap %</Label>
            <Input name="scrapPercent" type="number" step="0.01" defaultValue="0" className="max-w-[120px]" />
          </div>
          <Button type="submit">Create BOM</Button>
        </form>
      </Card>
      <DataTable
        headers={["Item", "Revision", "Qty", "Scrap %", "Status", ""]}
        rows={boms.map((b) => [
          b.item ? `${b.item.code} — ${b.item.name}` : b.itemId,
          b.revision,
          b.quantity,
          b.scrapPercent,
          <Badge key={b.id} tone="success">
            {b.status}
          </Badge>,
          <Link
            key={`link-${b.id}`}
            href={`/manufacturing/bom/${b.id}`}
            className="text-sm text-[var(--color-accent)] underline"
          >
            View
          </Link>,
        ])}
      />
    </div>
  );
}
