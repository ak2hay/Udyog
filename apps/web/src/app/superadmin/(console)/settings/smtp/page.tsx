import {
  actionTestSmtp,
  getMaskedSettings,
  savePlatformSettings,
} from "@/app/actions/platform";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import Link from "next/link";

export default async function SmtpSettingsPage() {
  const s = await getMaskedSettings("smtp");

  return (
    <div>
      <PageHeader title="SMTP" description="Outbound mail for password reset and OTP" />
      <Card>
        <form action={savePlatformSettings} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="key" value="smtp" />
          <div>
            <Label>Host</Label>
            <Input name="host" defaultValue={String(s.host || "")} />
          </div>
          <div>
            <Label>Port</Label>
            <Input name="port" type="number" defaultValue={String(s.port ?? 587)} />
          </div>
          <div>
            <Label>User</Label>
            <Input name="user" defaultValue={String(s.user || "")} />
          </div>
          <div>
            <Label>Password</Label>
            <Input name="password" type="password" defaultValue={String(s.password || "")} placeholder="Leave masked to keep" />
          </div>
          <div>
            <Label>From name</Label>
            <Input name="fromName" defaultValue={String(s.fromName || "")} />
          </div>
          <div>
            <Label>From email</Label>
            <Input name="fromEmail" type="email" defaultValue={String(s.fromEmail || "")} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="secure" defaultChecked={Boolean(s.secure)} />
            Use TLS (secure)
          </label>
          <div>
            <Button type="submit">Save SMTP</Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold">Send test email</h2>
        <form action={actionTestSmtp} className="mt-3 flex max-w-md gap-2">
          <Input name="to" type="email" placeholder="you@example.com" required />
          <Button type="submit" variant="secondary">
            Send
          </Button>
        </form>
      </Card>

      <p className="mt-4">
        <Link href="/superadmin/settings" className="text-sm text-[var(--color-accent)] underline">
          ← Settings
        </Link>
      </p>
    </div>
  );
}
