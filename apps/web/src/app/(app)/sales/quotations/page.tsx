import {
  confirmQuotation,
  createQuotation,
  createSalesOrderFromQuotation,
  listCustomersOptions,
  listQuotations,
} from "@/app/actions/sales-purchase";
import { listItems } from "@/app/actions/masters";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader, Select } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

async function submitSalesOrderFromQuote(quotationId: string) {
  "use server";
  await createSalesOrderFromQuotation(quotationId);
}

export default async function QuotationsPage() {
  const [quotes, customers, items] = await Promise.all([
    listQuotations(),
    listCustomersOptions(),
    listItems(),
  ]);
  const fg = items.filter((i) => i.itemType === "finished_good" || i.itemType === "raw_material");

  return (
    <div>
      <PageHeader title="Quotations" description="Create and confirm customer quotes" />
      <Card className="mb-6">
        <form action={createQuotation} className="grid gap-3 sm:grid-cols-4">
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
              {fg.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} — {i.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Qty</Label>
            <Input name="quantity" type="number" defaultValue="100" required />
          </div>
          <div>
            <Label>Unit price</Label>
            <Input name="unitPrice" type="number" defaultValue="2500" required />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit">Create quotation</Button>
          </div>
        </form>
      </Card>
      <DataTable
        headers={["Number", "Date", "Total", "Status", "Actions"]}
        rows={quotes.map((q) => [
          q.number,
          q.quoteDate,
          formatMoney(q.totalAmount),
          <Badge key={q.id} tone={q.status === "confirmed" || q.status === "posted" ? "success" : "neutral"}>
            {q.status}
          </Badge>,
          <div key={`${q.id}-a`} className="flex gap-2">
            {q.status === "draft" ? (
              <form action={confirmQuotation.bind(null, q.id)}>
                <Button type="submit" variant="secondary">
                  Confirm
                </Button>
              </form>
            ) : null}
            {q.status === "confirmed" ? (
              <form action={submitSalesOrderFromQuote.bind(null, q.id)}>
                <Button type="submit">Create SO</Button>
              </form>
            ) : null}
          </div>,
        ])}
      />
    </div>
  );
}
