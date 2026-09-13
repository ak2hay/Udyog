import { createCustomer, listCustomers } from "@/app/actions/masters";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader } from "@/components/ui";

export default async function CustomersPage() {
  const rows = await listCustomers();
  return (
    <div>
      <PageHeader title="Customers" description="CRM customer master" />
      <Card className="mb-6">
        <form action={createCustomer} className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Code</Label>
            <Input name="code" required placeholder="CUST-002" />
          </div>
          <div>
            <Label>Name</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>GSTIN</Label>
            <Input name="gstin" />
          </div>
          <div>
            <Label>Contact</Label>
            <Input name="contactPerson" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input name="phone" />
          </div>
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit">Add customer</Button>
          </div>
        </form>
      </Card>
      <DataTable
        headers={["Code", "Name", "GSTIN", "Phone", "Payment terms", "Status"]}
        rows={rows.map((r) => [
          r.code,
          r.name,
          r.gstin || "—",
          r.phone || "—",
          r.paymentTerms || "—",
          <Badge key={r.id} tone={r.isActive ? "success" : "neutral"}>
            {r.isActive ? "Active" : "Inactive"}
          </Badge>,
        ])}
      />
    </div>
  );
}
