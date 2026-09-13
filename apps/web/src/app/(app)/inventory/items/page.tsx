import { createItem, listItems } from "@/app/actions/masters";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader, Select } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function ItemsPage() {
  const rows = await listItems();
  return (
    <div>
      <PageHeader title="Items" description="Product / material master" />
      <Card className="mb-6">
        <form action={createItem} className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>Code</Label>
            <Input name="code" required />
          </div>
          <div>
            <Label>Name</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>Type</Label>
            <Select name="itemType" defaultValue="raw_material">
              <option value="raw_material">Raw material</option>
              <option value="finished_good">Finished good</option>
              <option value="wip">WIP</option>
              <option value="consumable">Consumable</option>
            </Select>
          </div>
          <div>
            <Label>UOM</Label>
            <Input name="uom" defaultValue="PCS" />
          </div>
          <div>
            <Label>Material / grade</Label>
            <Input name="materialGrade" />
          </div>
          <div>
            <Label>Drawing no.</Label>
            <Input name="drawingNumber" />
          </div>
          <div>
            <Label>HSN</Label>
            <Input name="hsn" />
          </div>
          <div>
            <Label>GST %</Label>
            <Input name="gstRate" defaultValue="18" />
          </div>
          <div>
            <Label>Sale price</Label>
            <Input name="salePrice" defaultValue="0" />
          </div>
          <div>
            <Label>Purchase price</Label>
            <Input name="purchasePrice" defaultValue="0" />
          </div>
          <div>
            <Label>Min stock</Label>
            <Input name="minStock" defaultValue="0" />
          </div>
          <div>
            <Label>Reorder level</Label>
            <Input name="reorderLevel" defaultValue="0" />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit">Add item</Button>
          </div>
        </form>
      </Card>
      <DataTable
        headers={["Code", "Name", "Type", "UOM", "HSN", "Sale", "Purchase", "Reorder"]}
        rows={rows.map((r) => [
          r.code,
          r.name,
          <Badge key={r.id}>{r.itemType}</Badge>,
          r.uom,
          r.hsn || "—",
          formatMoney(r.salePrice),
          formatMoney(r.purchasePrice),
          r.reorderLevel,
        ])}
      />
    </div>
  );
}
