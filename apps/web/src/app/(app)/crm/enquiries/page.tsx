import {
  createEnquiry,
  listEnquiries,
  listCustomersOptions,
  listItemsForDocs,
} from "@/app/actions/sales-purchase";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader, Select } from "@/components/ui";

export default async function EnquiriesPage() {
  const [rows, customers, items] = await Promise.all([
    listEnquiries(),
    listCustomersOptions(),
    listItemsForDocs(),
  ]);

  return (
    <div>
      <PageHeader title="Enquiries" description="Capture customer demand before quotation" />
      <Card className="mb-8">
        <form action={createEnquiry} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Customer</Label>
            <Select name="customerId" defaultValue="">
              <option value="">Walk-in / new</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Customer name (if walk-in)</Label>
            <Input name="customerName" />
          </div>
          <div className="sm:col-span-2">
            <Label>Subject</Label>
            <Input name="subject" required placeholder="Enquiry for machined flanges" />
          </div>
          <div>
            <Label>Item (optional)</Label>
            <Select name="itemId" defaultValue="">
              <option value="">None</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} — {i.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input name="quantity" type="number" step="0.001" defaultValue="1" />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Input name="description" />
          </div>
          <div>
            <Button type="submit">Create enquiry</Button>
          </div>
        </form>
      </Card>
      <DataTable
        headers={["Number", "Date", "Subject", "Customer", "Status"]}
        rows={rows.map((r) => [
          r.number,
          r.enquiryDate,
          r.subject || "—",
          r.customerName || r.customerId || "—",
          <Badge key={r.id}>{r.status}</Badge>,
        ])}
      />
    </div>
  );
}
