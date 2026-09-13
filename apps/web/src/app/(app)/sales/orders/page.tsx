import { createSalesOrder, listCustomersOptions, listSalesOrders } from "@/app/actions/sales-purchase";
import { listItems } from "@/app/actions/masters";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader, Select } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function SalesOrdersPage() {
  const [orders, customers, items] = await Promise.all([
    listSalesOrders(),
    listCustomersOptions(),
    listItems(),
  ]);
  return (
    <div>
      <PageHeader title="Sales orders" description="Confirmed customer orders" />
      <Card className="mb-6">
        <form action={createSalesOrder} className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>Customer</Label>
            <Select name="customerId" required>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
            <Input name="quantity" defaultValue="100" required />
          </div>
          <div>
            <Label>Unit price</Label>
            <Input name="unitPrice" defaultValue="2500" required />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit">Create sales order</Button>
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
