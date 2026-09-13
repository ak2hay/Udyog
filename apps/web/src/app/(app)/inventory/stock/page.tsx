import {
  adjustStock,
  listItems,
  listStock,
  listWarehouses,
} from "@/app/actions/masters";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader, Select } from "@/components/ui";
import { formatQty } from "@/lib/utils";

export default async function StockPage() {
  const [stock, warehouses, items] = await Promise.all([listStock(), listWarehouses(), listItems()]);
  return (
    <div>
      <PageHeader title="Stock" description="Balances and adjustments (movements only)" />
      <Card className="mb-6">
        <form action={adjustStock} className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>Warehouse</Label>
            <Select name="warehouseId" required>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Item</Label>
            <Select name="itemId" required>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} — {i.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Qty (+ in / − out)</Label>
            <Input name="quantity" type="number" step="0.001" required />
          </div>
          <div>
            <Label>Notes</Label>
            <Input name="notes" placeholder="Opening / adjustment" />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit">Post adjustment</Button>
          </div>
        </form>
      </Card>
      <DataTable
        headers={["Warehouse", "Item", "Qty", "Reserved", "UOM", "Reorder", "Status"]}
        rows={stock.map((s) => {
          const low = Number(s.quantity) < Number(s.reorderLevel || 0);
          return [
            s.warehouseName,
            `${s.itemCode} — ${s.itemName}`,
            formatQty(s.quantity),
            formatQty(s.reservedQuantity),
            s.uom,
            formatQty(s.reorderLevel),
            <Badge key={s.id} tone={low ? "warning" : "success"}>
              {low ? "Low" : "OK"}
            </Badge>,
          ];
        })}
      />
    </div>
  );
}
