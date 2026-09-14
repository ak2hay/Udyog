import { cache } from "react";
import { auth } from "./auth";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb, memberships, tenants } from "@rkyves/db";
import { redirect } from "next/navigation";
import {
  canAccessModuleWithPlan,
  type ModuleKey,
  type RoleKey,
} from "@rkyves/shared";
import { getPlanModuleKeys, isPlatformAdminUser } from "./platform";
import { getImpersonatedTenantId } from "./impersonation";

/** One session lookup per RSC request (layout + pages + server actions share this). */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requirePlatformAdmin() {
  const session = await getSession();
  if (!session?.user) redirect("/superadmin/login");
  const ok = await isPlatformAdminUser(session.user.id, session.user.email);
  if (!ok) redirect("/superadmin/login?error=forbidden");
  return session;
}

async function resolveTenantContext(allowSuspended: boolean) {
  const session = await requireSession();
  const db = getDb();

  const impersonateTenantId = await getImpersonatedTenantId();
  if (impersonateTenantId) {
    const isAdmin = await isPlatformAdminUser(session.user.id, session.user.email);
    if (isAdmin) {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, impersonateTenantId),
      });
      if (!tenant) {
        redirect("/superadmin/tenants");
      }
      const membershipRow = await db.query.memberships.findFirst({
        where: and(eq(memberships.tenantId, tenant.id), eq(memberships.isActive, true)),
      });
      const membership = membershipRow ?? {
        id: "impersonation",
        tenantId: tenant.id,
        userId: session.user.id,
        role: "owner",
        department: null,
        designation: "Platform Impersonation",
        branchId: null,
        isActive: true,
        createdAt: new Date(),
      };
      return { session, membership, tenant, db, impersonating: true as const };
    }
  }

  const rows = await db
    .select({
      membership: memberships,
      tenant: tenants,
    })
    .from(memberships)
    .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
    .where(and(eq(memberships.userId, session.user.id), eq(memberships.isActive, true)))
    .limit(1);

  const row = rows[0];
  if (!row) redirect("/onboarding");

  if (
    !allowSuspended &&
    (row.tenant.status === "suspended" || row.tenant.status === "cancelled")
  ) {
    redirect("/billing/locked");
  }

  return { session, membership: row.membership, tenant: row.tenant, db, impersonating: false as const };
}

/** One tenant/membership resolution per RSC request (single joined query). */
export const requireTenantContext = cache(async () => resolveTenantContext(false));

/** Billing pages for suspended tenants */
export const requireTenantContextAllowSuspended = cache(async () => resolveTenantContext(true));

/** Server-side RBAC: throws if the membership role cannot access the module. */
export async function requireModuleAccess(module: ModuleKey) {
  const ctx = await requireTenantContext();
  const role = ctx.membership.role as RoleKey;
  const planMods = await getPlanModuleKeys(ctx.tenant.planId);
  if (!canAccessModuleWithPlan(role, module, planMods)) {
    throw new Error(`Forbidden: ${role} cannot access ${module}`);
  }
  return { ...ctx, role, planModules: planMods };
}
