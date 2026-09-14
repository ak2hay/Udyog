import { randomInt } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { getDb, verifications } from "@rkyves/db";
import { getOtpSettings } from "./platform";
import { sendPlatformEmail } from "./smtp";

function otpId() {
  return `otp_${Date.now()}_${randomInt(1e9)}`;
}

export async function createAndSendEmailOtp(email: string, purpose: "login" | "signup" = "login") {
  const otp = await getOtpSettings();
  if (!otp?.emailEnabled) {
    return { ok: false as const, error: "Email OTP is disabled" };
  }

  const length = Math.min(8, Math.max(4, otp.length || 6));
  const max = 10 ** length;
  const code = String(randomInt(0, max)).padStart(length, "0");
  const expiryMinutes = otp.expiryMinutes || 10;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60_000);
  const identifier = `otp:${purpose}:${email.toLowerCase()}`;

  const db = getDb();
  // Clear prior codes for this identifier
  await db.delete(verifications).where(eq(verifications.identifier, identifier));

  await db.insert(verifications).values({
    id: otpId(),
    identifier,
    value: code,
    expiresAt,
  });

  await sendPlatformEmail({
    to: email,
    subject: `Your verification code: ${code}`,
    text: `Your OTP is ${code}. It expires in ${expiryMinutes} minutes.`,
  });

  return { ok: true as const };
}

export async function verifyEmailOtp(
  email: string,
  code: string,
  purpose: "login" | "signup" = "login",
) {
  const identifier = `otp:${purpose}:${email.toLowerCase()}`;
  const db = getDb();
  const row = await db.query.verifications.findFirst({
    where: and(
      eq(verifications.identifier, identifier),
      eq(verifications.value, code.trim()),
      gt(verifications.expiresAt, new Date()),
    ),
  });
  if (!row) return { ok: false as const, error: "Invalid or expired OTP" };
  await db.delete(verifications).where(eq(verifications.id, row.id));
  return { ok: true as const };
}
