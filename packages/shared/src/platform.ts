import type { ModuleKey } from "./permissions";
import { MODULES } from "./permissions";

export const TENANT_STATUSES = ["active", "trial", "suspended", "cancelled"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "suspended",
  "cancelled",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PLAN_INTERVALS = ["month", "year"] as const;
export type PlanInterval = (typeof PLAN_INTERVALS)[number];

export const PLATFORM_SETTING_KEYS = [
  "smtp",
  "otp",
  "razorpay",
  "app",
  "security",
] as const;
export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[number];

export type SmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
};

export type OtpSettings = {
  emailEnabled: boolean;
  length: number;
  expiryMinutes: number;
  smsEnabled: boolean;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromNumber: string;
};

export type RazorpaySettings = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  mode: "test" | "live";
};

export type AppSettings = {
  publicName: string;
  supportEmail: string;
  defaultTrialDays: number;
  signupOpen: boolean;
};

export type SecuritySettings = {
  requireEmailVerifyBeforeTenant: boolean;
  sessionIdleMinutes: number;
};

/** Default modules for seeded SaaS plans (master plan §38). */
export const DEFAULT_PLAN_MODULES: Record<string, ModuleKey[]> = {
  starter: ["dashboard", "crm", "sales", "purchase", "inventory", "finance", "admin"],
  growth: [
    "dashboard",
    "crm",
    "sales",
    "purchase",
    "inventory",
    "manufacturing",
    "quality",
    "finance",
    "admin",
  ],
  enterprise: [...MODULES],
};

export function planAllowsModule(planModules: string[] | null | undefined, module: ModuleKey): boolean {
  if (!planModules || planModules.length === 0) return true;
  return planModules.includes(module);
}
