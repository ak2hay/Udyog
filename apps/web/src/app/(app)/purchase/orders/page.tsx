import { createPurchaseOrder, listPurchaseOrders, listSuppliersOptions } from "@/app/actions/sales-purchase";
import { listItems } from "@/app/actions/masters";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader, Select } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function PurchaseOrdersPage() {
  const [orders, suppliers, items] = await Promise.all([
    listPurchaseOrders(),
    listSuppliersOptions(),
    listItems(),
  ]);
  return (
    <div>
      <PageHeader title="Purchase orders" description="Buy materials from suppliers" />
      <Card className="mb-6">
        <form action={createPurchaseOrder} className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>Supplier</Label>
            <Select name="supplierId" required>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
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
            <Label>Qty</Label>
            <Input name="quantity" defaultValue="500" required />
          </div>
          <div>
            <Label>Unit price</Label>
            <Input name="unitPrice" defaultValue="85" required />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit">Create PO</Button>
          </div>
        </form>
      </Card>
      <DataTable
        headers={["Number", "Date", "Total", "Status"]}
        rows={orders.map((o) => [
          o.number,
          o.orderDate,
          formatMoney(o.totalAmount),
          <Badge key={o.id}>{o.status}</Badge>,
        ])}
      />
    </div>
  );
}
