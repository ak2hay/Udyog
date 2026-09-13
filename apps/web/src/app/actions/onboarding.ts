"use server";

import { eq } from "drizzle-orm";
import { getDb, tenants, memberships, warehouses, branches } from "@rkyves/db";
import { requireSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function createTenant(formData: FormData) {
  const session = await requireSession();
  const db = getDb();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Company name required");
  let slug = slugify(name) || `tenant-${Date.now()}`;
  const existing = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const [tenant] = await db
    .insert(tenants)
    .values({
      name,
      legalName: String(formData.get("legalName") || name),
      slug,
      industry: "manufacturing",
      businessType: "industrial_parts",
      gstin: String(formData.get("gstin") || "") || null,
      city: String(formData.get("city") || "") || null,
      state: String(formData.get("state") || "") || null,
      email: session.user.email,
    })
    .returning();

  const [branch] = await db
    .insert(branches)
    .values({
      tenantId: tenant.id,
      code: "HO",
      name: "Head Office",
      isDefault: true,
      city: String(formData.get("city") || "") || null,
      state: String(formData.get("state") || "") || null,
    })
    .returning();

  await db.insert(memberships).values({
    tenantId: tenant.id,
    userId: session.user.id,
    role: "owner",
    designation: "Owner",
    branchId: branch.id,
  });

  await db.insert(warehouses).values({
    tenantId: tenant.id,
    branchId: branch.id,
    code: "WH-MAIN",
    name: "Main Stores",
    isDefault: true,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/** Attach current user as owner of the seeded demo tenant */
export async function joinDemoTenant() {
  const session = await requireSession();
  const db = getDb();
  const demo = await db.query.tenants.findFirst({ where: eq(tenants.slug, "demo-precision") });
  if (!demo) throw new Error("Demo tenant not seeded. Run pnpm db:seed first.");

  const existing = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });
  if (existing) redirect("/dashboard");

  await db.insert(memberships).values({
    tenantId: demo.id,
    userId: session.user.id,
    role: "owner",
    designation: "Owner",
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
