import { getDashboardStats } from "@/app/actions/finance";
import { PageHeader, StatCard, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { brand } from "@rkyves/shared";
import { requireTenantContext } from "@/lib/session";

export default async function DashboardPage() {
  const { session, membership } = await requireTenantContext();
  const stats = await getDashboardStats();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${session.user.name.split(" ")[0]}`}
        description={`${brand.name} · ${membership.role} dashboard`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Sales orders" value={String(stats.salesOrders)} />
        <StatCard label="Production orders" value={String(stats.productionOrders)} />
        <StatCard label="Receivables" value={formatMoney(stats.receivables)} />
        <StatCard label="Payables" value={formatMoney(stats.payables)} />
        <StatCard label="Low stock items" value={String(stats.lowStock)} hint="Below reorder level" />
        <StatCard label="Open invoices" value={String(stats.openInvoices)} />
      </div>
      <Card className="mt-6">
        <p className="font-medium text-[var(--color-primary)]">Operational loop</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Quote → Sales order → Production → Job cards → QC → Dispatch → Invoice. Use the sidebar to
          move through the manufacturing flow.
        </p>
      </Card>
    </div>
  );
}
