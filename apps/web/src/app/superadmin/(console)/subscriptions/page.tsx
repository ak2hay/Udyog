import { listPlans, listSubscriptions, overrideSubscription } from "@/app/actions/platform";
import { Badge, Button, Card, DataTable, Label, PageHeader, Select } from "@/components/ui";
import { SUBSCRIPTION_STATUSES } from "@rkyves/shared";

export default async function SubscriptionsPage() {
  const rows = await listSubscriptions();
  const plans = await listPlans();

  return (
    <div>
      <PageHeader title="Subscriptions" description="Cross-tenant subscription status and overrides" />
      <DataTable
        headers={["Tenant", "Plan", "Status", "Razorpay", "Period end", "Override"]}
        rows={rows.map(({ sub, tenantName, planName }) => [
          tenantName,
          planName,
          <Badge
            key="b"
            tone={
              sub.status === "active"
                ? "success"
                : sub.status === "past_due" || sub.status === "suspended"
                  ? "danger"
                  : "warning"
            }
          >
            {sub.status}
          </Badge>,
          sub.razorpaySubscriptionId || "—",
          sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "—",
          <form key="f" action={overrideSubscription} className="flex flex-wrap items-end gap-1">
            <input type="hidden" name="subId" value={sub.id} />
            <Select name="status" defaultValue={sub.status} className="w-28">
              {SUBSCRIPTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select name="planId" defaultValue={sub.planId} className="w-28">
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary">
              Save
            </Button>
          </form>,
        ])}
      />
      <Card className="mt-6 text-sm text-[var(--color-muted)]">
        Manual overrides update tenant status without calling Razorpay. Use for ops recovery.
      </Card>
    </div>
  );
}
