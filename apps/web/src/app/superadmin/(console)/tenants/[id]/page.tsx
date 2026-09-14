import Link from "next/link";
import {
  getTenantDetail,
  startImpersonation,
  updateTenantLifecycle,
} from "@/app/actions/platform";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader, Select, Textarea } from "@/components/ui";
import { TENANT_STATUSES } from "@rkyves/shared";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenant, plan, members, subs, allPlans } = await getTenantDetail(id);

  return (
    <div>
      <PageHeader
        title={tenant.name}
        description={`${tenant.slug} · ${tenant.email || "no email"}`}
        actions={
          <form action={startImpersonation.bind(null, tenant.id)}>
            <Button type="submit" variant="secondary">
              Impersonate
            </Button>
          </form>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge
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
        </Badge>
        {plan ? <Badge>{plan.name}</Badge> : null}
      </div>

      <Card className="mb-6">
        <h2 className="font-semibold">Lifecycle & plan</h2>
        <form action={updateTenantLifecycle} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="tenantId" value={tenant.id} />
          <div>
            <Label>Status</Label>
            <Select name="status" defaultValue={tenant.status}>
              {TENANT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Plan</Label>
            <Select name="planId" defaultValue={tenant.planId || ""}>
              <option value="">None</option>
              {allPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Trial ends</Label>
            <Input
              name="trialEndsAt"
              type="date"
              defaultValue={
                tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toISOString().slice(0, 10) : ""
              }
            />
          </div>
          <div>
            <Label>Suspend reason</Label>
            <Textarea name="suspendedReason" defaultValue={tenant.suspendedReason || ""} rows={2} />
          </div>
          <div>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Card>

      <h2 className="mb-2 font-semibold">Users</h2>
      <DataTable
        headers={["Name", "Email", "Role", "Active"]}
        rows={members.map(({ user, membership }) => [
          user.name,
          user.email,
          membership.role,
          membership.isActive ? "Yes" : "No",
        ])}
      />

      <h2 className="mb-2 mt-8 font-semibold">Subscriptions</h2>
      <DataTable
        headers={["Status", "Razorpay sub", "Period end", "Updated"]}
        rows={subs.map((s) => [
          s.status,
          s.razorpaySubscriptionId || "—",
          s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : "—",
          new Date(s.updatedAt).toLocaleString(),
        ])}
      />

      <p className="mt-6">
        <Link href="/superadmin/tenants" className="text-sm text-[var(--color-accent)] underline">
          ← All tenants
        </Link>
      </p>
    </div>
  );
}
