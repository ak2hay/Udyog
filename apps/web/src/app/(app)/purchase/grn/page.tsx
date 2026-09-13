import { createGrn, listGrns, listPurchaseOrders } from "@/app/actions/sales-purchase";
import { listWarehouses } from "@/app/actions/masters";
import { Badge, Button, Card, DataTable, Label, PageHeader, Select } from "@/components/ui";

export default async function GrnPage() {
  const [grns, orders, warehouses] = await Promise.all([
    listGrns(),
    listPurchaseOrders(),
    listWarehouses(),
  ]);
  const openPos = orders.filter((o) => o.status === "confirmed" || o.status === "posted");

  return (
    <div>
      <PageHeader title="GRN" description="Receive purchased materials into warehouse" />
      <Card className="mb-6">
        <form action={createGrn} className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Purchase order</Label>
            <Select name="purchaseOrderId" required>
              {openPos.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.number} ({o.status})
                </option>
              ))}
            </Select>
          </div>
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
          <div className="flex items-end">
            <Button type="submit">Post GRN & update stock</Button>
          </div>
        </form>
      </Card>
      <DataTable
        headers={["Number", "Date", "Status"]}
        rows={grns.map((g) => [g.number, g.grnDate, <Badge key={g.id} tone="success">{g.status}</Badge>])}
      />
    </div>
  );
}
