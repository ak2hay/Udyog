import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { Card, PageHeader, Button } from "@/components/ui";
import { getDb, memberships, tenants } from "@rkyves/db";

export default async function BillingLockedPage() {
  const session = await requireSession();
  const db = getDb();
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });
  let reason = "Your company subscription is not active.";
  if (membership) {
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, membership.tenantId) });
    if (tenant?.status === "suspended") {
      reason = tenant.suspendedReason || "Your company account has been suspended.";
    } else if (tenant?.status === "cancelled") {
      reason = "Your company subscription was cancelled.";
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <Card className="w-full max-w-lg p-6">
        <PageHeader title="Account locked" description={reason} />
        <p className="text-sm text-[var(--color-muted)]">
          Contact your company owner or platform support to restore access.
        </p>
        <div className="mt-6 flex gap-2">
          <Link href="/billing">
            <Button>Billing</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">Back to login</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
