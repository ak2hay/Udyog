import Link from "next/link";
import { listPlans } from "@/app/actions/platform";
import { Badge, Button, DataTable, PageHeader } from "@/components/ui";

function formatInr(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export default async function PlansPage() {
  const rows = await listPlans();

  return (
    <div>
      <PageHeader
        title="Plans"
        description="Edit SaaS plans, pricing, and module entitlements"
        actions={
          <Link href="/superadmin/plans/new">
            <Button>New plan</Button>
          </Link>
        }
      />
      <DataTable
        headers={["Name", "Code", "Price", "Interval", "Users", "Active", ""]}
        rows={rows.map((p) => [
          p.name,
          p.code,
          formatInr(p.pricePaise),
          p.interval,
          String(p.maxUsers),
          p.isActive ? <Badge tone="success">Yes</Badge> : <Badge>No</Badge>,
          <Link key="e" href={`/superadmin/plans/${p.id}`} className="text-[var(--color-accent)] underline">
            Edit
          </Link>,
        ])}
      />
    </div>
  );
}
