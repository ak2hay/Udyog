import { cache } from "react";
import { auth } from "./auth";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb, memberships, tenants } from "@rkyves/db";
import { redirect } from "next/navigation";
import { canAccessModule, type ModuleKey, type RoleKey } from "@rkyves/shared";

/** One session lookup per RSC request (layout + pages + server actions share this). */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session;
}

/** One tenant/membership resolution per RSC request (single joined query). */
export const requireTenantContext = cache(async () => {
  const session = await requireSession();
  const db = getDb();
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
  return { session, membership: row.membership, tenant: row.tenant, db };
});

/** Server-side RBAC: throws if the membership role cannot access the module. */
export async function requireModuleAccess(module: ModuleKey) {
  const ctx = await requireTenantContext();
  const role = ctx.membership.role as RoleKey;
  if (!canAccessModule(role, module)) {
    throw new Error(`Forbidden: ${role} cannot access ${module}`);
  }
  return { ...ctx, role };
}
