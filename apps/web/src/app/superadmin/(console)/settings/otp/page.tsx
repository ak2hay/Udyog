import { getMaskedSettings, savePlatformSettings } from "@/app/actions/platform";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import Link from "next/link";

export default async function OtpSettingsPage() {
  const s = await getMaskedSettings("otp");

  return (
    <div>
      <PageHeader title="OTP" description="Email OTP enabled; SMS provider fields are stubs" />
      <Card>
        <form action={savePlatformSettings} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="key" value="otp" />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="emailEnabled" defaultChecked={Boolean(s.emailEnabled)} />
            Enable email OTP
          </label>
          <div>
            <Label>Code length</Label>
            <Input name="length" type="number" defaultValue={String(s.length ?? 6)} />
          </div>
          <div>
            <Label>Expiry (minutes)</Label>
            <Input name="expiryMinutes" type="number" defaultValue={String(s.expiryMinutes ?? 10)} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="smsEnabled" defaultChecked={Boolean(s.smsEnabled)} disabled />
            Enable SMS OTP (coming soon)
          </label>
          <div>
            <Label>Twilio Account SID</Label>
            <Input name="twilioAccountSid" defaultValue={String(s.twilioAccountSid || "")} disabled />
          </div>
          <div>
            <Label>Twilio Auth Token</Label>
            <Input name="twilioAuthToken" type="password" defaultValue={String(s.twilioAuthToken || "")} disabled />
          </div>
          <div className="sm:col-span-2">
            <Label>Twilio from number</Label>
            <Input name="twilioFromNumber" defaultValue={String(s.twilioFromNumber || "")} disabled />
          </div>
          <div>
            <Button type="submit">Save OTP</Button>
          </div>
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
