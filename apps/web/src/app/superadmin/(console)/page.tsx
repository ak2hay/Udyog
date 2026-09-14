import Link from "next/link";
import { getPlatformOverview } from "@/app/actions/platform";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";

function formatInr(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export default async function SuperAdminOverviewPage() {
  const data = await getPlatformOverview();

  return (
    <div>
      <PageHeader title="Platform overview" description="SaaS control plane KPIs and alerts" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tenants" value={String(data.tenantCount)} />
        <StatCard label="MRR" value={formatInr(data.mrrPaise)} hint="Active subscriptions" />
        <StatCard label="Trials" value={String(data.trialTenants)} />
        <StatCard label="Suspended" value={String(data.suspended)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-[var(--color-primary)]">Trials ending soon</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.trialsEnding.length === 0 ? (
              <li className="text-[var(--color-muted)]">None</li>
            ) : (
              data.trialsEnding.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <Link href={`/superadmin/tenants/${t.id}`} className="text-[var(--color-accent)] underline">
                    {t.name}
                  </Link>
                  <span className="text-[var(--color-muted)]">
                    {t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : "—"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold text-[var(--color-primary)]">Failed payment events</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.failedEvents.length === 0 ? (
              <li className="text-[var(--color-muted)]">None</li>
            ) : (
              data.failedEvents.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <span>{e.eventType}</span>
                  <Badge tone="danger">error</Badge>
                </li>
              ))
            )}
          </ul>
          <Link href="/superadmin/billing" className="mt-3 inline-block text-sm text-[var(--color-accent)] underline">
            View billing ops
          </Link>
        </Card>
      </div>
    </div>
  );
}
