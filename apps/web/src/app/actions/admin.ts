"use server";

import { and, eq, desc } from "drizzle-orm";
import { getDb, memberships, users, auditLogs } from "@rkyves/db";
import { ROLES, type RoleKey } from "@rkyves/shared";
import { requireModuleAccess } from "@/lib/session";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

async function audit(
  tenantId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  newValue?: unknown,
) {
  await getDb().insert(auditLogs).values({
    tenantId,
    userId,
    action,
    entityType,
    entityId,
    newValue: newValue as object,
  });
}

export async function listMembers() {
  const { tenant, db } = await requireModuleAccess("admin");
  const rows = await db
    .select({
      membershipId: memberships.id,
      role: memberships.role,
      designation: memberships.designation,
      isActive: memberships.isActive,
      createdAt: memberships.createdAt,
      userId: users.id,
      name: users.name,
      email: users.email,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.tenantId, tenant.id))
    .orderBy(desc(memberships.createdAt));
  return rows;
}

export async function inviteUser(formData: FormData) {
  const { tenant, session, db, role } = await requireModuleAccess("admin");
  if (role !== "owner") throw new Error("Only owners can invite users");

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const memberRole = String(formData.get("role") || "sales") as RoleKey;
  if (!name || !email || password.length < 8) {
    throw new Error("Name, email, and password (min 8) are required");
  }
  if (!ROLES.includes(memberRole)) throw new Error("Invalid role");

  const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
  let userId = existingUser?.id;

  if (!userId) {
    const created = await auth.api.signUpEmail({
      body: { name, email, password },
      headers: await headers(),
    });
    userId = created.user.id;
  }

  const existingMembership = await db.query.memberships.findFirst({
    where: and(eq(memberships.tenantId, tenant.id), eq(memberships.userId, userId)),
  });
  if (existingMembership) throw new Error("User is already a member of this company");

  const [row] = await db
    .insert(memberships)
    .values({
      tenantId: tenant.id,
      userId,
      role: memberRole,
      designation: String(formData.get("designation") || "") || null,
    })
    .returning();

  await audit(tenant.id, session.user.id, "invite", "membership", row.id, {
    email,
    role: memberRole,
  });
  revalidatePath("/admin/users");
}

export async function updateMemberRole(formData: FormData) {
  const { tenant, session, db, role } = await requireModuleAccess("admin");
  if (role !== "owner") throw new Error("Only owners can change roles");

  const membershipId = String(formData.get("membershipId"));
  const memberRole = String(formData.get("role") || "sales") as RoleKey;
  if (!ROLES.includes(memberRole)) throw new Error("Invalid role");

  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.id, membershipId), eq(memberships.tenantId, tenant.id)),
  });
  if (!membership) throw new Error("Membership not found");
  if (membership.userId === session.user.id && memberRole !== "owner") {
    throw new Error("Cannot demote your own owner role");
  }

  await db
    .update(memberships)
    .set({ role: memberRole })
    .where(eq(memberships.id, membershipId));

  await audit(tenant.id, session.user.id, "update_role", "membership", membershipId, {
    role: memberRole,
  });
  revalidatePath("/admin/users");
}

export async function setMemberActive(formData: FormData) {
  const { tenant, session, db, role } = await requireModuleAccess("admin");
  if (role !== "owner") throw new Error("Only owners can activate/deactivate users");

  const membershipId = String(formData.get("membershipId"));
  const isActive = String(formData.get("isActive")) === "true";

  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.id, membershipId), eq(memberships.tenantId, tenant.id)),
  });
  if (!membership) throw new Error("Membership not found");
  if (membership.userId === session.user.id && !isActive) {
    throw new Error("Cannot deactivate yourself");
  }

  await db.update(memberships).set({ isActive }).where(eq(memberships.id, membershipId));
  await audit(tenant.id, session.user.id, isActive ? "activate" : "deactivate", "membership", membershipId);
  revalidatePath("/admin/users");
}
