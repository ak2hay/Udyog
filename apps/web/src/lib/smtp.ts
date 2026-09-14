import nodemailer from "nodemailer";
import { getSmtpSettings } from "./platform";

export async function sendPlatformEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const smtp = await getSmtpSettings();
  if (!smtp?.host || !smtp.fromEmail) {
    console.info(`[email:fallback] To: ${opts.to} | ${opts.subject}\n${opts.text}`);
    return { ok: true as const, via: "console" as const };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port || 587,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
  });

  await transporter.sendMail({
    from: `"${smtp.fromName || "Rkyves"}" <${smtp.fromEmail}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html ?? opts.text.replace(/\n/g, "<br/>"),
  });

  return { ok: true as const, via: "smtp" as const };
}

export async function testSmtpConnection(to: string) {
  return sendPlatformEmail({
    to,
    subject: "Rkyves SMTP test",
    text: "This is a test email from the Super Admin platform settings.",
  });
}
