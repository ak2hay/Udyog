"use server";

import { and, count, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import {
  getDb,
  memberships,
  paymentEvents,
  plans,
  planModules,
  platformAdmins,
  platformAuditLogs,
  tenants,
  tenantSubscriptions,
  users,
  branches,
  warehouses,
} from "@rkyves/db";
import { MODULES, type ModuleKey, type PlatformSettingKey, type TenantStatus } from "@rkyves/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/session";
import {
  getSetting,
  maskSettingsForClient,
  upsertSetting,
  writePlatformAudit,
} from "@/lib/platform";
import { encryptSecret } from "@/lib/secrets";
import { testSmtpConnection } from "@/lib/smtp";
import { syncRazorpayPlan, validateRazorpayKeys, createRazorpaySubscription } from "@/lib/razorpay";
import { setImpersonationCookie, clearImpersonationCookie } from "@/lib/impersonation";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function getPlatformOverview() {
  await requirePlatformAdmin();
  const db = getDb();

  const [tenantCount] = await db.select({ c: count() }).from(tenants);
  const [activeSubs] = await db
    .select({ c: count() })
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.status, "active"));
  const [trialTenants] = await db.select({ c: count() }).from(tenants).where(eq(tenants.status, "trial"));
  const [suspended] = await db.select({ c: count() }).from(tenants).where(eq(tenants.status, "suspended"));

  const mrrRows = await db
    .select({
      price: plans.pricePaise,
      interval: plans.interval,
    })
    .from(tenantSubscriptions)
    .innerJoin(plans, eq(tenantSubscriptions.planId, plans.id))
    .where(eq(tenantSubscriptions.status, "active"));

  let mrrPaise = 0;
  for (const row of mrrRows) {
    mrrPaise += row.interval === "year" ? Math.round(row.price / 12) : row.price;
  }

  const trialsEnding = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.status, "trial"), gte(tenants.trialEndsAt, new Date())))
    .orderBy(tenants.trialEndsAt)
    .limit(5);

  const failedEvents = await db
    .select()
    .from(paymentEvents)
    .where(sql`${paymentEvents.error} is not null`)
    .orderBy(desc(paymentEvents.createdAt))
    .limit(5);

  return {
    tenantCount: tenantCount?.c ?? 0,
    activeSubscriptions: activeSubs?.c ?? 0,
    trialTenants: trialTenants?.c ?? 0,
    suspended: suspended?.c ?? 0,
    mrrPaise,
    trialsEnding,
    failedEvents,
  };
}

export async function listTenants(search?: string) {
  await requirePlatformAdmin();
  const db = getDb();
  const q = search?.trim();
  return db
    .select({
      tenant: tenants,
      planName: plans.name,
      planCode: plans.code,
    })
    .from(tenants)
    .leftJoin(plans, eq(tenants.planId, plans.id))
    .where(
      q
        ? or(ilike(tenants.name, `%${q}%`), ilike(tenants.slug, `%${q}%`), ilike(tenants.email, `%${q}%`))
        : undefined,
    )
    .orderBy(desc(tenants.createdAt))
    .limit(100);
}

export async function getTenantDetail(tenantId: string) {
  await requirePlatformAdmin();
  const db = getDb();
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) throw new Error("Tenant not found");

  const plan = tenant.planId
    ? await db.query.plans.findFirst({ where: eq(plans.id, tenant.planId) })
    : null;

  const members = await db
    .select({ membership: memberships, user: users })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.tenantId, tenantId));

  const subs = await db
    .select()
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.tenantId, tenantId))
    .orderBy(desc(tenantSubscriptions.createdAt));

  const allPlans = await db.select().from(plans).orderBy(plans.sortOrder);
  return { tenant, plan, members, subs, allPlans };
}

export async function createTenantAsPlatform(formData: FormData) {
  const session = await requirePlatformAdmin();
  const db = getDb();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name required");
  let slug = slugify(name) || `tenant-${Date.now()}`;
  const existing = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const planId = String(formData.get("planId") || "") || null;
  const trialDays = Number(formData.get("trialDays") || 14);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  const [tenant] = await db
    .insert(tenants)
    .values({
      name,
      legalName: String(formData.get("legalName") || name),
      slug,
      email: String(formData.get("email") || "") || null,
      status: "trial",
      planId,
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
    })
    .returning();

  await db.insert(warehouses).values({
    tenantId: tenant.id,
    branchId: branch.id,
    code: "WH-MAIN",
    name: "Main Stores",
    isDefault: true,
  });

  if (planId) {
    await db.insert(tenantSubscriptions).values({
      tenantId: tenant.id,
      planId,
      status: "trialing",
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEndsAt,
    });
  }

  await writePlatformAudit({
    actorUserId: session.user.id,
    action: "tenant.create",
    targetType: "tenant",
    targetId: tenant.id,
    metadata: { name, slug, planId },
  });

  revalidatePath("/superadmin/tenants");
  redirect(`/superadmin/tenants/${tenant.id}`);
}

export async function updateTenantLifecycle(formData: FormData) {
  const session = await requirePlatformAdmin();
  const db = getDb();
  const tenantId = String(formData.get("tenantId"));
  const status = String(formData.get("status")) as TenantStatus;
  const planId = String(formData.get("planId") || "") || null;
  const trialEndsAtRaw = String(formData.get("trialEndsAt") || "");
  const suspendedReason = String(formData.get("suspendedReason") || "") || null;

  const patch: Partial<typeof tenants.$inferInsert> = {
    status,
    planId,
    updatedAt: new Date(),
  };
  if (trialEndsAtRaw) patch.trialEndsAt = new Date(trialEndsAtRaw);
  if (status === "suspended") {
    patch.suspendedAt = new Date();
    patch.suspendedReason = suspendedReason;
  } else {
    patch.suspendedAt = null;
    patch.suspendedReason = null;
  }

  await db.update(tenants).set(patch).where(eq(tenants.id, tenantId));

  if (planId) {
    const latest = await db.query.tenantSubscriptions.findFirst({
      where: eq(tenantSubscriptions.tenantId, tenantId),
      orderBy: [desc(tenantSubscriptions.createdAt)],
    });
    const subStatus =
      status === "active"
        ? "active"
        : status === "trial"
          ? "trialing"
          : status === "suspended"
            ? "suspended"
            : "cancelled";
    if (latest) {
      await db
        .update(tenantSubscriptions)
        .set({ planId, status: subStatus, updatedAt: new Date() })
        .where(eq(tenantSubscriptions.id, latest.id));
    } else {
      await db.insert(tenantSubscriptions).values({
        tenantId,
        planId,
        status: subStatus,
      });
    }
  }

  await writePlatformAudit({
    actorUserId: session.user.id,
    action: "tenant.update",
    targetType: "tenant",
    targetId: tenantId,
    metadata: { status, planId, suspendedReason },
  });

  revalidatePath(`/superadmin/tenants/${tenantId}`);
  revalidatePath("/superadmin/tenants");
  revalidatePath("/superadmin/subscriptions");
}

export async function startImpersonation(tenantId: string) {
  const session = await requirePlatformAdmin();
  await setImpersonationCookie(tenantId);
  await writePlatformAudit({
    actorUserId: session.user.id,
    action: "impersonation.start",
    targetType: "tenant",
    targetId: tenantId,
  });
  redirect("/dashboard");
}

export async function endImpersonation() {
  const session = await requirePlatformAdmin();
  await clearImpersonationCookie();
  await writePlatformAudit({
    actorUserId: session.user.id,
    action: "impersonation.end",
    targetType: "platform",
  });
  redirect("/superadmin/tenants");
}

export async function listPlans() {
  await requirePlatformAdmin();
  const db = getDb();
  return db.select().from(plans).orderBy(plans.sortOrder);
}

export async function getPlanDetail(planId: string) {
  await requirePlatformAdmin();
  const db = getDb();
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, planId) });
  if (!plan) throw new Error("Plan not found");
  const mods = await db.select().from(planModules).where(eq(planModules.planId, planId));
  return { plan, modules: mods.map((m) => m.moduleKey) };
}

export async function savePlan(formData: FormData) {
  const session = await requirePlatformAdmin();
  const db = getDb();
  const id = String(formData.get("id") || "");
  const code = String(formData.get("code") || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  const name = String(formData.get("name") || "").trim();
  if (!code || !name) throw new Error("Code and name required");

  const priceRupees = Number(formData.get("priceRupees") || 0);
  const values = {
    code,
    name,
    description: String(formData.get("description") || "") || null,
    pricePaise: Math.round(priceRupees * 100),
    currency: String(formData.get("currency") || "INR"),
    interval: String(formData.get("interval") || "month"),
    maxUsers: Number(formData.get("maxUsers") || 5),
    maxBranches: Number(formData.get("maxBranches") || 1),
    isPublic: formData.get("isPublic") === "on",
    isActive: formData.get("isActive") === "on",
    sortOrder: Number(formData.get("sortOrder") || 0),
    updatedAt: new Date(),
  };

  const selectedModules = MODULES.filter((m) => formData.get(`module_${m}`) === "on") as ModuleKey[];

  let planId = id;
  if (id) {
    await db.update(plans).set(values).where(eq(plans.id, id));
    await db.delete(planModules).where(eq(planModules.planId, id));
  } else {
    const [created] = await db.insert(plans).values(values).returning();
    planId = created.id;
  }

  if (selectedModules.length) {
    await db.insert(planModules).values(selectedModules.map((moduleKey) => ({ planId, moduleKey })));
  }

  if (formData.get("syncRazorpay") === "on" && values.pricePaise > 0) {
    try {
      const existing = await db.query.plans.findFirst({ where: eq(plans.id, planId) });
      const synced = await syncRazorpayPlan({
        name: values.name,
        amountPaise: values.pricePaise,
        currency: values.currency,
        interval: values.interval as "month" | "year",
        existingPlanId: existing?.razorpayPlanId,
      });
      await db
        .update(plans)
        .set({ razorpayPlanId: synced.razorpayPlanId, updatedAt: new Date() })
        .where(eq(plans.id, planId));
    } catch (e) {
      console.error("Razorpay plan sync failed", e);
    }
  }

  await writePlatformAudit({
    actorUserId: session.user.id,
    action: id ? "plan.update" : "plan.create",
    targetType: "plan",
    targetId: planId,
    metadata: { code, modules: selectedModules },
  });

  revalidatePath("/superadmin/plans");
  redirect(`/superadmin/plans/${planId}`);
}

export async function listSubscriptions() {
  await requirePlatformAdmin();
  const db = getDb();
  return db
    .select({
      sub: tenantSubscriptions,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      planName: plans.name,
      planCode: plans.code,
      pricePaise: plans.pricePaise,
    })
    .from(tenantSubscriptions)
    .innerJoin(tenants, eq(tenantSubscriptions.tenantId, tenants.id))
    .innerJoin(plans, eq(tenantSubscriptions.planId, plans.id))
    .orderBy(desc(tenantSubscriptions.updatedAt))
    .limit(200);
}

export async function overrideSubscription(formData: FormData) {
  const session = await requirePlatformAdmin();
  const db = getDb();
  const subId = String(formData.get("subId"));
  const status = String(formData.get("status"));
  const planId = String(formData.get("planId") || "");

  const patch: Partial<typeof tenantSubscriptions.$inferInsert> = {
    status,
    updatedAt: new Date(),
  };
  if (planId) patch.planId = planId;

  await db.update(tenantSubscriptions).set(patch).where(eq(tenantSubscriptions.id, subId));

  const sub = await db.query.tenantSubscriptions.findFirst({
    where: eq(tenantSubscriptions.id, subId),
  });
  if (sub) {
    const tenantStatus =
      status === "active"
        ? "active"
        : status === "trialing"
          ? "trial"
          : status === "suspended" || status === "past_due"
            ? "suspended"
            : "cancelled";
    await db
      .update(tenants)
      .set({
        status: tenantStatus,
        planId: planId || sub.planId,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, sub.tenantId));
  }

  await writePlatformAudit({
    actorUserId: session.user.id,
    action: "subscription.override",
    targetType: "subscription",
    targetId: subId,
    metadata: { status, planId },
  });

  revalidatePath("/superadmin/subscriptions");
}

export async function listPaymentEvents() {
  await requirePlatformAdmin();
  const db = getDb();
  return db.select().from(paymentEvents).orderBy(desc(paymentEvents.createdAt)).limit(100);
}

export async function listPlatformAdmins() {
  await requirePlatformAdmin();
  const db = getDb();
  return db
    .select({ admin: platformAdmins, user: users })
    .from(platformAdmins)
    .innerJoin(users, eq(platformAdmins.userId, users.id))
    .orderBy(desc(platformAdmins.createdAt));
}

export async function addPlatformAdmin(formData: FormData) {
  const session = await requirePlatformAdmin();
  const db = getDb();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) throw new Error("User must sign up before being granted platform admin");

  const existing = await db.query.platformAdmins.findFirst({
    where: eq(platformAdmins.userId, user.id),
  });
  if (!existing) {
    await db.insert(platformAdmins).values({
      userId: user.id,
      createdBy: session.user.id,
    });
  }

  await writePlatformAudit({
    actorUserId: session.user.id,
    action: "admin.add",
    targetType: "user",
    targetId: user.id,
    metadata: { email },
  });

  revalidatePath("/superadmin/admins");
}

export async function removePlatformAdmin(formData: FormData) {
  const session = await requirePlatformAdmin();
  const db = getDb();
  const adminId = String(formData.get("adminId"));
  const row = await db.query.platformAdmins.findFirst({ where: eq(platformAdmins.id, adminId) });
  if (row?.userId === session.user.id) throw new Error("Cannot remove yourself");
  await db.delete(platformAdmins).where(eq(platformAdmins.id, adminId));
  await writePlatformAudit({
    actorUserId: session.user.id,
    action: "admin.remove",
    targetType: "platform_admin",
    targetId: adminId,
  });
  revalidatePath("/superadmin/admins");
}

export async function getMaskedSettings(key: PlatformSettingKey) {
  await requirePlatformAdmin();
  const raw = (await getSetting<Record<string, unknown>>(key)) ?? {};
  return maskSettingsForClient(key, raw);
}

export async function savePlatformSettings(formData: FormData) {
  const session = await requirePlatformAdmin();
  const key = String(formData.get("key")) as PlatformSettingKey;
  const previous = (await getSetting<Record<string, unknown>>(key)) ?? {};

  let value: Record<string, unknown> = {};
  if (key === "smtp") {
    value = {
      host: String(formData.get("host") || ""),
      port: Number(formData.get("port") || 587),
      secure: formData.get("secure") === "on",
      user: String(formData.get("user") || ""),
      password: String(formData.get("password") || ""),
      fromName: String(formData.get("fromName") || ""),
      fromEmail: String(formData.get("fromEmail") || ""),
    };
  } else if (key === "otp") {
    value = {
      emailEnabled: formData.get("emailEnabled") === "on",
      length: Number(formData.get("length") || 6),
      expiryMinutes: Number(formData.get("expiryMinutes") || 10),
      smsEnabled: formData.get("smsEnabled") === "on",
      twilioAccountSid: String(formData.get("twilioAccountSid") || ""),
      twilioAuthToken: String(formData.get("twilioAuthToken") || ""),
      twilioFromNumber: String(formData.get("twilioFromNumber") || ""),
    };
  } else if (key === "razorpay") {
    value = {
      keyId: String(formData.get("keyId") || ""),
      keySecret: String(formData.get("keySecret") || ""),
      webhookSecret: String(formData.get("webhookSecret") || ""),
      mode: String(formData.get("mode") || "test"),
    };
  } else if (key === "app") {
    value = {
      publicName: String(formData.get("publicName") || "Rkyves"),
      supportEmail: String(formData.get("supportEmail") || ""),
      defaultTrialDays: Number(formData.get("defaultTrialDays") || 14),
      signupOpen: formData.get("signupOpen") === "on",
    };
  } else if (key === "security") {
    value = {
      requireEmailVerifyBeforeTenant: formData.get("requireEmailVerifyBeforeTenant") === "on",
      sessionIdleMinutes: Number(formData.get("sessionIdleMinutes") || 480),
    };
  }

  const secretFields = new Set(["password", "twilioAuthToken", "keySecret", "webhookSecret"]);
  const merged: Record<string, unknown> = { ...previous };
  for (const [k, v] of Object.entries(value)) {
    if (secretFields.has(k)) {
      if (typeof v === "string" && v && !v.includes("••••")) {
        merged[k] = encryptSecret(v);
      }
      // else keep previous
    } else {
      merged[k] = v;
    }
  }

  await upsertSetting(key, merged, session.user.id);
  await writePlatformAudit({
    actorUserId: session.user.id,
    action: "settings.update",
    targetType: "settings",
    targetId: key,
  });

  revalidatePath("/superadmin/settings");
}

export async function actionTestSmtp(formData: FormData) {
  await requirePlatformAdmin();
  const to = String(formData.get("to") || "").trim();
  if (!to) throw new Error("Recipient email required");
  await testSmtpConnection(to);
}

export async function actionValidateRazorpay() {
  await requirePlatformAdmin();
  await validateRazorpayKeys();
}

export async function listAuditLogs() {
  await requirePlatformAdmin();
  const db = getDb();
  return db
    .select({
      log: platformAuditLogs,
      actorEmail: users.email,
      actorName: users.name,
    })
    .from(platformAuditLogs)
    .leftJoin(users, eq(platformAuditLogs.actorUserId, users.id))
    .orderBy(desc(platformAuditLogs.createdAt))
    .limit(200);
}

/** Tenant owner: start Razorpay subscription checkout for a plan */
export async function startTenantCheckout(planId: string) {
  const { requireTenantContextAllowSuspended } = await import("@/lib/session");
  const ctx = await requireTenantContextAllowSuspended();
  if (ctx.membership.role !== "owner") throw new Error("Only owner can manage billing");

  const db = getDb();
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, planId) });
  if (!plan?.isActive) throw new Error("Plan not available");

  let razorpayPlanId = plan.razorpayPlanId;
  if (!razorpayPlanId && plan.pricePaise > 0) {
    const synced = await syncRazorpayPlan({
      name: plan.name,
      amountPaise: plan.pricePaise,
      currency: plan.currency,
      interval: plan.interval as "month" | "year",
    });
    razorpayPlanId = synced.razorpayPlanId;
    await db
      .update(plans)
      .set({ razorpayPlanId, updatedAt: new Date() })
      .where(eq(plans.id, plan.id));
  }

  if (!razorpayPlanId) {
    // Free plan — activate immediately
    await db
      .update(tenants)
      .set({ planId: plan.id, status: "active", updatedAt: new Date() })
      .where(eq(tenants.id, ctx.tenant.id));
    await db.insert(tenantSubscriptions).values({
      tenantId: ctx.tenant.id,
      planId: plan.id,
      status: "active",
      currentPeriodStart: new Date(),
    });
    revalidatePath("/billing");
    return { free: true as const };
  }

  const created = await createRazorpaySubscription({
    razorpayPlanId,
    notes: { tenantId: ctx.tenant.id, planId: plan.id },
  });

  await db.insert(tenantSubscriptions).values({
    tenantId: ctx.tenant.id,
    planId: plan.id,
    status: "trialing",
    razorpaySubscriptionId: created.subscriptionId,
  });

  revalidatePath("/billing");
  return {
    free: false as const,
    subscriptionId: created.subscriptionId,
    keyId: created.keyId,
    shortUrl: created.shortUrl,
  };
}

export async function listPublicPlans() {
  const db = getDb();
  return db
    .select()
    .from(plans)
    .where(and(eq(plans.isActive, true), eq(plans.isPublic, true)))
    .orderBy(plans.sortOrder);
}
