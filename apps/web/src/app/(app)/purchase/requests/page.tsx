import {
  createPurchaseRequest,
  listPurchaseRequests,
  listItemsForPurchase,
} from "@/app/actions/sales-purchase";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader, Select } from "@/components/ui";

export default async function PurchaseRequestsPage() {
  const [rows, items] = await Promise.all([listPurchaseRequests(), listItemsForPurchase()]);

  return (
    <div>
      <PageHeader title="Purchase requests" description="Internal material demand before PO" />
      <Card className="mb-8">
        <form action={createPurchaseRequest} className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Item</Label>
            <Select name="itemId" required defaultValue="">
              <option value="" disabled>
                Select item
              </option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} — {i.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input name="quantity" type="number" step="0.001" defaultValue="1" required />
          </div>
          <div>
            <Label>Required by</Label>
            <Input name="requiredDate" type="date" />
          </div>
          <div className="sm:col-span-3">
            <Label>Notes</Label>
            <Input name="notes" />
          </div>
          <div>
            <Button type="submit">Create PR</Button>
          </div>
        </form>
      </Card>
      <DataTable
        headers={["Number", "Date", "Required", "Status", "Notes"]}
        rows={rows.map((r) => [
          r.number,
          r.requestDate,
          r.requiredDate || "—",
          <Badge key={r.id}>{r.status}</Badge>,
          r.notes || "—",
        ])}
      />
    </div>
  );
}
