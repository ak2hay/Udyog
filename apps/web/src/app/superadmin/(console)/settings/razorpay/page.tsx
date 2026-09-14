import {
  actionValidateRazorpay,
  getMaskedSettings,
  savePlatformSettings,
} from "@/app/actions/platform";
import { Button, Card, Input, Label, PageHeader, Select } from "@/components/ui";
import Link from "next/link";

export default async function RazorpaySettingsPage() {
  const s = await getMaskedSettings("razorpay");

  return (
    <div>
      <PageHeader title="Razorpay" description="Keys used for plan sync, checkout, and webhooks" />
      <Card>
        <form action={savePlatformSettings} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="key" value="razorpay" />
          <div>
            <Label>Key ID</Label>
            <Input name="keyId" defaultValue={String(s.keyId || "")} />
          </div>
          <div>
            <Label>Key secret</Label>
            <Input name="keySecret" type="password" defaultValue={String(s.keySecret || "")} />
          </div>
          <div>
            <Label>Webhook secret</Label>
            <Input name="webhookSecret" type="password" defaultValue={String(s.webhookSecret || "")} />
          </div>
          <div>
            <Label>Mode</Label>
            <Select name="mode" defaultValue={String(s.mode || "test")}>
              <option value="test">Test</option>
              <option value="live">Live</option>
            </Select>
          </div>
          <div>
            <Button type="submit">Save Razorpay</Button>
          </div>
        </form>
      </Card>
      <Card className="mt-6">
        <form action={actionValidateRazorpay}>
          <Button type="submit" variant="secondary">
            Validate keys
          </Button>
        </form>
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Webhook URL: /api/webhooks/razorpay
        </p>
      </Card>
      <p className="mt-4">
        <Link href="/superadmin/settings" className="text-sm text-[var(--color-accent)] underline">
          ← Settings
        </Link>
      </p>
    </div>
  );
}
