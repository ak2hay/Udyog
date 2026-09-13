import {
  createDispatch,
  createSalesInvoiceFromDispatch,
  listDispatches,
  listSalesOrdersFin,
  listWarehousesFin,
} from "@/app/actions/finance";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader, Select } from "@/components/ui";

async function submitDispatch(formData: FormData) {
  "use server";
  await createDispatch(formData);
}

async function submitInvoice(challanId: string) {
  "use server";
  await createSalesInvoiceFromDispatch(challanId);
}

export default async function DispatchPage() {
  const [dispatches, orders, warehouses] = await Promise.all([
    listDispatches(),
    listSalesOrdersFin(),
    listWarehousesFin(),
  ]);
  const open = orders.filter((o) => o.status === "confirmed" || o.status === "completed");

  return (
    <div>
      <PageHeader title="Dispatch" description="Delivery challans from finished goods" />
      <Card className="mb-6">
        <form action={submitDispatch} className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>Sales order</Label>
            <Select name="salesOrderId" required>
              {open.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.number}
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
          <div>
            <Label>Transporter</Label>
            <Input name="transporter" />
          </div>
          <div>
            <Label>Vehicle</Label>
            <Input name="vehicleNumber" />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit">Post delivery challan</Button>
          </div>
        </form>
      </Card>
      <DataTable
        headers={["Number", "Date", "Status", "Invoice"]}
        rows={dispatches.map((d) => [
          d.number,
          d.challanDate,
          <Badge key={d.id}>{d.status}</Badge>,
          <form key={`${d.id}-i`} action={submitInvoice.bind(null, d.id)}>
            <Button type="submit" variant="secondary">
              Create invoice
            </Button>
          </form>,
        ])}
      />
    </div>
  );
}
