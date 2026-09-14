import { eq } from "drizzle-orm";
import {
  getDb,
  platformAdmins,
  platformAuditLogs,
  platformSettings,
  planModules,
  users,
} from "@rkyves/db";
import type {
  AppSettings,
  OtpSettings,
  PlatformSettingKey,
  RazorpaySettings,
  SecuritySettings,
  SmtpSettings,
} from "@rkyves/shared";
import { decryptSecret, encryptSecret } from "./secrets";

export function parseSuperAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isPlatformAdminUser(userId: string, email: string): Promise<boolean> {
  const emails = parseSuperAdminEmails();
  if (emails.includes(email.toLowerCase())) return true;
  const db = getDb();
  const row = await db.query.platformAdmins.findFirst({
    where: eq(platformAdmins.userId, userId),
  });
  return Boolean(row);
}

export async function writePlatformAudit(input: {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  const db = getDb();
  await db.insert(platformAuditLogs).values({
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? null,
    ipAddress: input.ipAddress ?? null,
  });
}

export async function getSetting<T>(key: PlatformSettingKey): Promise<T | null> {
  const db = getDb();
  const row = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, key),
  });
  return (row?.value as T) ?? null;
}

export async function upsertSetting(
  key: PlatformSettingKey,
  value: unknown,
  updatedBy?: string,
) {
  const db = getDb();
  const existing = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, key),
  });
  if (existing) {
    await db
      .update(platformSettings)
      .set({ value: value as object, updatedAt: new Date(), updatedBy: updatedBy ?? null })
      .where(eq(platformSettings.id, existing.id));
  } else {
    await db.insert(platformSettings).values({
      key,
      value: value as object,
      updatedBy: updatedBy ?? null,
    });
  }
}

const SECRET_FIELDS: Record<string, string[]> = {
  smtp: ["password"],
  otp: ["twilioAuthToken"],
  razorpay: ["keySecret", "webhookSecret"],
};

export function encryptSettingsPayload(key: PlatformSettingKey, value: Record<string, unknown>) {
  const fields = SECRET_FIELDS[key] ?? [];
  const out = { ...value };
  for (const f of fields) {
    const v = out[f];
    if (typeof v === "string" && v && !v.includes("••••")) {
      out[f] = encryptSecret(v);
    } else if (typeof v === "string" && v.includes("••••")) {
      delete out[f]; // keep previous on merge
    }
  }
  return out;
}

export function decryptSettingsForUse(key: PlatformSettingKey, value: Record<string, unknown>) {
  const fields = SECRET_FIELDS[key] ?? [];
  const out = { ...value };
  for (const f of fields) {
    if (typeof out[f] === "string") out[f] = decryptSecret(out[f] as string);
  }
  return out;
}

export function maskSettingsForClient(key: PlatformSettingKey, value: Record<string, unknown>) {
  const fields = SECRET_FIELDS[key] ?? [];
  const out = { ...value };
  for (const f of fields) {
    if (typeof out[f] === "string" && (out[f] as string)) {
      out[f] = "••••••••";
    }
  }
  return out;
}

export async function getSmtpSettings(): Promise<SmtpSettings | null> {
  const raw = await getSetting<Record<string, unknown>>("smtp");
  if (!raw) return null;
  return decryptSettingsForUse("smtp", raw) as unknown as SmtpSettings;
}

export async function getOtpSettings(): Promise<OtpSettings | null> {
  const raw = await getSetting<Record<string, unknown>>("otp");
  if (!raw) return null;
  return decryptSettingsForUse("otp", raw) as unknown as OtpSettings;
}

export async function getRazorpaySettings(): Promise<RazorpaySettings | null> {
  const raw = await getSetting<Record<string, unknown>>("razorpay");
  if (!raw) return null;
  return decryptSettingsForUse("razorpay", raw) as unknown as RazorpaySettings;
}

export async function getAppSettings(): Promise<AppSettings> {
  const raw = (await getSetting<AppSettings>("app")) ?? {
    publicName: "Rkyves",
    supportEmail: "support@rkyves.local",
    defaultTrialDays: 14,
    signupOpen: true,
  };
  return raw;
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  return (
    (await getSetting<SecuritySettings>("security")) ?? {
      requireEmailVerifyBeforeTenant: false,
      sessionIdleMinutes: 480,
    }
  );
}

export async function getPlanModuleKeys(planId: string | null | undefined): Promise<string[] | null> {
  if (!planId) return null;
  const db = getDb();
  const rows = await db.select({ moduleKey: planModules.moduleKey }).from(planModules).where(eq(planModules.planId, planId));
  return rows.map((r) => r.moduleKey);
}

export async function findUserByEmail(email: string) {
  const db = getDb();
  return db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
}
