import { eq } from "drizzle-orm";
import { getDb, plans, tenantSubscriptions } from "@rkyves/db";
import { requireTenantContextAllowSuspended } from "@/lib/session";
import { listPublicPlans } from "@/app/actions/platform";
import { Badge, Card, PageHeader } from "@/components/ui";
import { PlanCheckoutButton } from "@/components/plan-checkout-button";
import Link from "next/link";
import { ImpersonationBanner } from "@/components/impersonation-banner";

function formatInr(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export default async function TenantBillingPage() {
  const { tenant, membership, impersonating } = await requireTenantContextAllowSuspended();
  const publicPlans = await listPublicPlans();
  const db = getDb();
  const currentPlan = tenant.planId
    ? await db.query.plans.findFirst({ where: eq(plans.id, tenant.planId) })
    : null;
  const sub = await db.query.tenantSubscriptions.findFirst({
    where: eq(tenantSubscriptions.tenantId, tenant.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {impersonating ? <ImpersonationBanner tenantName={tenant.name} /> : null}
      <div className="mx-auto max-w-5xl px-4 py-8">
        <PageHeader
          title="Billing"
          description={`${tenant.name} · manage subscription`}
          actions={
            tenant.status === "active" || tenant.status === "trial" ? (
              <Link href="/dashboard" className="text-sm text-[var(--color-accent)] underline">
                Back to app
              </Link>
            ) : null
          }
        />
        <Card className="mb-6">
          <p className="text-sm text-[var(--color-muted)]">Current status</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              tone={
                tenant.status === "active"
                  ? "success"
                  : tenant.status === "trial"
                    ? "warning"
                    : "danger"
              }
            >
              {tenant.status}
            </Badge>
            {currentPlan ? <span className="font-medium">{currentPlan.name}</span> : <span>No plan</span>}
          </div>
          {sub?.razorpaySubscriptionId ? (
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Razorpay subscription: {sub.razorpaySubscriptionId}
            </p>
          ) : null}
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {publicPlans.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <h2 className="text-lg font-semibold text-[var(--color-primary)]">{p.name}</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{p.description}</p>
              <p className="mt-4 text-2xl font-semibold">
                {formatInr(p.pricePaise)}
                <span className="text-sm font-normal text-[var(--color-muted)]">/{p.interval}</span>
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Up to {p.maxUsers} users · {p.maxBranches} branches
              </p>
              <div className="mt-auto pt-4">
                {membership.role === "owner" ? (
                  <PlanCheckoutButton
                    planId={p.id}
                    label={tenant.planId === p.id ? "Current / renew" : "Choose plan"}
                  />
                ) : (
                  <p className="text-xs text-[var(--color-muted)]">Only owners can change plans</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
