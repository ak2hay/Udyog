"use server";

import { eq } from "drizzle-orm";
import {
  getDb,
  tenants,
  memberships,
  warehouses,
  branches,
  plans,
  tenantSubscriptions,
} from "@rkyves/db";
import { requireSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAppSettings, getSecuritySettings } from "@/lib/platform";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function createTenant(formData: FormData) {
  const session = await requireSession();
  const security = await getSecuritySettings();
  if (security.requireEmailVerifyBeforeTenant && !session.user.emailVerified) {
    throw new Error("Verify your email before creating a company");
  }

  const app = await getAppSettings();
  if (!app.signupOpen) throw new Error("New company signup is closed");

  const db = getDb();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Company name required");
  let slug = slugify(name) || `tenant-${Date.now()}`;
  const existing = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const starter = await db.query.plans.findFirst({ where: eq(plans.code, "starter") });
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + (app.defaultTrialDays || 14));

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
      status: "trial",
      planId: starter?.id ?? null,
      trialEndsAt,
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

  if (starter) {
    await db.insert(tenantSubscriptions).values({
      tenantId: tenant.id,
      planId: starter.id,
      status: "trialing",
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEndsAt,
    });
  }

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
