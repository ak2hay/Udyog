import { auth } from "./auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, memberships, tenants } from "@rkyves/db";
import { redirect } from "next/navigation";
import { canAccessModule, type ModuleKey, type RoleKey } from "@rkyves/shared";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireTenantContext() {
  const session = await requireSession();
  const db = getDb();
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });
  if (!membership) redirect("/onboarding");
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, membership.tenantId),
  });
  if (!tenant) redirect("/onboarding");
  return { session, membership, tenant, db };
}

/** Server-side RBAC: throws if the membership role cannot access the module. */
export async function requireModuleAccess(module: ModuleKey) {
  const ctx = await requireTenantContext();
  const role = ctx.membership.role as RoleKey;
  if (!canAccessModule(role, module)) {
    throw new Error(`Forbidden: ${role} cannot access ${module}`);
  }
  return { ...ctx, role };
}
