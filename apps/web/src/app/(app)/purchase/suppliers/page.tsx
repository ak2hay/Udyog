import { createSupplier, listSuppliers } from "@/app/actions/masters";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader } from "@/components/ui";

export default async function SuppliersPage() {
  const rows = await listSuppliers();
  return (
    <div>
      <PageHeader title="Suppliers" description="Purchase supplier master" />
      <Card className="mb-6">
        <form action={createSupplier} className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Code</Label>
            <Input name="code" required />
          </div>
          <div>
            <Label>Name</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>Lead time (days)</Label>
            <Input name="leadTimeDays" defaultValue="7" />
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
            <Input name="email" />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit">Add supplier</Button>
          </div>
        </form>
      </Card>
      <DataTable
        headers={["Code", "Name", "Phone", "Lead time", "Status"]}
        rows={rows.map((r) => [
          r.code,
          r.name,
          r.phone || "—",
          r.leadTimeDays,
          <Badge key={r.id} tone="success">
            Active
          </Badge>,
        ])}
      />
    </div>
  );
}
