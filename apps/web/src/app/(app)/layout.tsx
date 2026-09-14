import { requireTenantContext } from "@/lib/session";
import { AppSidebar } from "@/components/app-sidebar";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import type { RoleKey } from "@rkyves/shared";

/** Run near Neon (ap-southeast-1) to cut DB RTT from ~250ms to ~20ms. */
export const preferredRegion = "sin1";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, membership, tenant, impersonating } = await requireTenantContext();

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <AppSidebar
        role={membership.role as RoleKey}
        tenantName={tenant.name}
        userName={session.user.name}
      />
      <main className="flex-1 overflow-y-auto">
        {impersonating ? <ImpersonationBanner tenantName={tenant.name} /> : null}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
