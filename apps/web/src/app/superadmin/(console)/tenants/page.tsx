import Link from "next/link";
import { listPlans, listTenants } from "@/app/actions/platform";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader, Select } from "@/components/ui";
import { createTenantAsPlatform } from "@/app/actions/platform";

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const rows = await listTenants(q);
  const plans = await listPlans();

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Create, suspend, and assign plans across the platform"
      />

      <form className="mb-4 flex gap-2" method="get">
        <Input name="q" defaultValue={q} placeholder="Search name, slug, email…" className="max-w-sm" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <DataTable
        headers={["Name", "Slug", "Status", "Plan", "Created", ""]}
        rows={rows.map(({ tenant, planName }) => [
          tenant.name,
          tenant.slug,
          <Badge
            key="s"
            tone={
              tenant.status === "active"
                ? "success"
                : tenant.status === "trial"
                  ? "warning"
                  : tenant.status === "suspended"
                    ? "danger"
                    : "neutral"
            }
          >
            {tenant.status}
          </Badge>,
          planName || "—",
          new Date(tenant.createdAt).toLocaleDateString(),
          <Link key="l" href={`/superadmin/tenants/${tenant.id}`} className="text-[var(--color-accent)] underline">
            Open
          </Link>,
        ])}
      />

      <Card className="mt-8">
        <h2 className="font-semibold text-[var(--color-primary)]">Create tenant</h2>
        <form action={createTenantAsPlatform} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>Legal name</Label>
            <Input name="legalName" />
          </div>
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" />
          </div>
          <div>
            <Label>Plan</Label>
            <Select name="planId" defaultValue="">
              <option value="">None</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Trial days</Label>
            <Input name="trialDays" type="number" defaultValue={14} />
          </div>
          <div className="flex items-end">
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
