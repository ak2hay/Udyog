import { listAuditLogs, updateCompany } from "@/app/actions/finance";
import { requireTenantContext } from "@/lib/session";
import { Button, Card, DataTable, Input, Label, PageHeader } from "@/components/ui";

export default async function AdminCompanyPage() {
  const { tenant } = await requireTenantContext();
  const logs = await listAuditLogs();

  return (
    <div>
      <PageHeader title="Company & audit" description="Tenant settings and activity history" />
      <Card className="mb-8">
        <form action={updateCompany} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Company name</Label>
            <Input name="name" defaultValue={tenant.name} />
          </div>
          <div>
            <Label>Legal name</Label>
            <Input name="legalName" defaultValue={tenant.legalName || ""} />
          </div>
          <div>
            <Label>GSTIN</Label>
            <Input name="gstin" defaultValue={tenant.gstin || ""} />
          </div>
          <div>
            <Label>PAN</Label>
            <Input name="pan" defaultValue={tenant.pan || ""} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input name="phone" defaultValue={tenant.phone || ""} />
          </div>
          <div>
            <Label>Email</Label>
            <Input name="email" defaultValue={tenant.email || ""} />
          </div>
          <div>
            <Label>City</Label>
            <Input name="city" defaultValue={tenant.city || ""} />
          </div>
          <div>
            <Label>State</Label>
            <Input name="state" defaultValue={tenant.state || ""} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Save company</Button>
          </div>
        </form>
      </Card>
      <PageHeader title="Audit log" description="Who changed what" />
      <DataTable
        headers={["When", "Action", "Entity", "Entity ID", "User"]}
        rows={logs.map((l) => [
          new Date(l.createdAt).toLocaleString("en-IN"),
          l.action,
          l.entityType,
          l.entityId || "—",
          l.userId || "—",
        ])}
      />
    </div>
  );
}
