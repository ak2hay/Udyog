import Razorpay from "razorpay";
import crypto from "crypto";
import { getRazorpaySettings } from "./platform";

export async function getRazorpayClient() {
  const settings = await getRazorpaySettings();
  const keyId = settings?.keyId || process.env.RAZORPAY_KEY_ID || "";
  const keySecret = settings?.keySecret || process.env.RAZORPAY_KEY_SECRET || "";
  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys not configured");
  }
  return {
    client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
    keyId,
    keySecret,
    webhookSecret: settings?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "",
    mode: settings?.mode || "test",
  };
}

export async function validateRazorpayKeys() {
  const { client } = await getRazorpayClient();
  // Lightweight call — list plans (or customers) with count 1
  await client.plans.all({ count: 1 });
  return { ok: true as const };
}

/** Create/sync a Razorpay plan from our plan row (amount in paise). */
export async function syncRazorpayPlan(input: {
  name: string;
  amountPaise: number;
  currency: string;
  interval: "month" | "year";
  existingPlanId?: string | null;
}) {
  const { client } = await getRazorpayClient();
  if (input.existingPlanId) {
    return { razorpayPlanId: input.existingPlanId };
  }
  const period = input.interval === "year" ? "yearly" : "monthly";
  const plan = await client.plans.create({
    period,
    interval: 1,
    item: {
      name: input.name,
      amount: input.amountPaise,
      currency: input.currency || "INR",
    },
  });
  return { razorpayPlanId: plan.id as string };
}

export async function createRazorpaySubscription(input: {
  razorpayPlanId: string;
  totalCount?: number;
  customerNotify?: boolean;
  notes?: Record<string, string>;
}) {
  const { client, keyId } = await getRazorpayClient();
  const sub = await client.subscriptions.create({
    plan_id: input.razorpayPlanId,
    total_count: input.totalCount ?? 12,
    customer_notify: input.customerNotify ?? 1,
    notes: input.notes,
  });
  return {
    subscriptionId: sub.id as string,
    shortUrl: (sub as { short_url?: string }).short_url,
    keyId,
  };
}

export function verifyRazorpayWebhookSignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
