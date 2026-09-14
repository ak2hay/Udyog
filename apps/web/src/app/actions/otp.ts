"use server";

import { getOtpSettings } from "@/lib/platform";
import { createAndSendEmailOtp, verifyEmailOtp } from "@/lib/otp";

export async function isEmailOtpEnabled() {
  const otp = await getOtpSettings();
  return Boolean(otp?.emailEnabled);
}

export async function sendLoginOtp(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) throw new Error("Email required");
  const result = await createAndSendEmailOtp(email, "login");
  if (!result.ok) throw new Error(result.error);
}

export async function verifyLoginOtpAction(email: string, code: string) {
  return verifyEmailOtp(email, code, "login");
}
