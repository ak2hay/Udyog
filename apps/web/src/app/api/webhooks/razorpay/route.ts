import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, paymentEvents, tenants, tenantSubscriptions } from "@rkyves/db";
import { getRazorpayClient, verifyRazorpayWebhookSignature } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  let webhookSecret = "";
  try {
    const rz = await getRazorpayClient();
    webhookSecret = rz.webhookSecret;
  } catch {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
  }

  if (!webhookSecret || !verifyRazorpayWebhookSignature(body, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const payload = JSON.parse(body) as {
    event: string;
    payload?: {
      subscription?: { entity?: Record<string, unknown> };
      payment?: { entity?: Record<string, unknown> };
    };
  };

  const eventId =
    (payload as { id?: string }).id ||
    `${payload.event}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const db = getDb();
  const existing = await db.query.paymentEvents.findFirst({
    where: eq(paymentEvents.eventId, eventId),
  });
  if (existing?.processedAt) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  const [eventRow] = existing
    ? [existing]
    : await db
        .insert(paymentEvents)
        .values({
          eventId,
          eventType: payload.event,
          payload,
        })
        .returning();

  try {
    const subEntity = payload.payload?.subscription?.entity;
    const subId = subEntity?.id as string | undefined;
    const notes = (subEntity?.notes || {}) as Record<string, string>;
    const tenantId = notes.tenantId;
    const planId = notes.planId;

    if (subId) {
      const local = await db.query.tenantSubscriptions.findFirst({
        where: eq(tenantSubscriptions.razorpaySubscriptionId, subId),
      });

      const statusMap: Record<string, string> = {
        "subscription.activated": "active",
        "subscription.charged": "active",
        "subscription.pending": "trialing",
        "subscription.halted": "past_due",
        "subscription.cancelled": "cancelled",
        "subscription.completed": "cancelled",
      };
      const newStatus = statusMap[payload.event];

      if (local && newStatus) {
        await db
          .update(tenantSubscriptions)
          .set({
            status: newStatus,
            currentPeriodStart: subEntity?.current_start
              ? new Date(Number(subEntity.current_start) * 1000)
              : undefined,
            currentPeriodEnd: subEntity?.current_end
              ? new Date(Number(subEntity.current_end) * 1000)
              : undefined,
            updatedAt: new Date(),
          })
          .where(eq(tenantSubscriptions.id, local.id));

        const tenantStatus =
          newStatus === "active"
            ? "active"
            : newStatus === "trialing"
              ? "trial"
              : newStatus === "past_due"
                ? "suspended"
                : "cancelled";

        await db
          .update(tenants)
          .set({
            status: tenantStatus,
            planId: local.planId,
            updatedAt: new Date(),
            suspendedAt: tenantStatus === "suspended" ? new Date() : null,
          })
          .where(eq(tenants.id, local.tenantId));
      } else if (!local && tenantId && planId && newStatus === "active") {
        await db.insert(tenantSubscriptions).values({
          tenantId,
          planId,
          status: "active",
          razorpaySubscriptionId: subId,
        });
        await db
          .update(tenants)
          .set({ status: "active", planId, updatedAt: new Date() })
          .where(eq(tenants.id, tenantId));
      }
    }

    await db
      .update(paymentEvents)
      .set({ processedAt: new Date(), error: null })
      .where(eq(paymentEvents.id, eventRow.id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "processing failed";
    await db
      .update(paymentEvents)
      .set({ error: message })
      .where(eq(paymentEvents.id, eventRow.id));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
