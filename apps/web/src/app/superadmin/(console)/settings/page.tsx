import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";

const sections = [
  { href: "/superadmin/settings/smtp", title: "SMTP", desc: "Outbound email for resets and OTP" },
  { href: "/superadmin/settings/otp", title: "OTP", desc: "Email OTP and SMS stub" },
  { href: "/superadmin/settings/razorpay", title: "Razorpay", desc: "Payment keys and webhook secret" },
  { href: "/superadmin/settings/app", title: "App", desc: "Public name, trial days, signup" },
  { href: "/superadmin/settings/security", title: "Security", desc: "Verification and session hints" },
];

export default function SettingsIndexPage() {
  return (
    <div>
      <PageHeader title="Configuration" description="Platform-wide integrations and defaults" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition hover:border-[var(--color-accent)]">
              <h2 className="font-semibold text-[var(--color-primary)]">{s.title}</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{s.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
