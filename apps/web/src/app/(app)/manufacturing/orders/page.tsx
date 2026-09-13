import {
  createProductionOrder,
  issueMaterialsForProduction,
  listBoms,
  listFinishedGoods,
  listProductionOrders,
  listSalesOrdersForMfg,
  listWarehousesForMfg,
} from "@/app/actions/manufacturing";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader, Select } from "@/components/ui";
import { formatQty } from "@/lib/utils";

async function submitProductionOrder(formData: FormData) {
  "use server";
  await createProductionOrder(formData);
}

export default async function ProductionOrdersPage() {
  const [orders, salesOrders, items, warehouses, boms] = await Promise.all([
    listProductionOrders(),
    listSalesOrdersForMfg(),
    listFinishedGoods(),
    listWarehousesForMfg(),
    listBoms(),
  ]);

  return (
    <div>
      <PageHeader title="Production orders" description="Plan and issue materials for manufacture" />
      <Card className="mb-6">
        <form action={submitProductionOrder} className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>Sales order (optional)</Label>
            <Select name="salesOrderId" defaultValue="">
              <option value="">—</option>
              {salesOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.number}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Finished good</Label>
            <Select name="itemId" required>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} — {i.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input name="quantity" defaultValue="100" required />
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
          <div className="sm:col-span-4">
            <Button type="submit">Create production order + job cards</Button>
          </div>
        </form>
      </Card>
      <DataTable
        headers={["Number", "Qty", "Completed", "WIP", "Status", "Actions"]}
        rows={orders.map((o) => [
          o.number,
          formatQty(o.quantity),
          formatQty(o.completedQuantity),
          formatQty(o.wipQuantity),
          <Badge key={o.id}>{o.status}</Badge>,
          o.status === "confirmed" ? (
            <form key={`${o.id}-i`} action={issueMaterialsForProduction.bind(null, o.id)}>
              <Button type="submit" variant="secondary">
                Issue materials
              </Button>
            </form>
          ) : (
            "—"
          ),
        ])}
      />
      <div className="mt-8">
        <PageHeader title="Active BOMs" description="Engineering bill of materials" />
        <DataTable
          headers={["Item", "Revision", "Status"]}
          rows={boms.map((b) => [
            b.item ? `${b.item.code} — ${b.item.name}` : b.itemId,
            b.revision,
            <Badge key={b.id} tone="success">
              {b.status}
            </Badge>,
          ])}
        />
      </div>
    </div>
  );
}
