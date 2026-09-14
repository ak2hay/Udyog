import { getMaskedSettings, savePlatformSettings } from "@/app/actions/platform";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import Link from "next/link";

export default async function SecuritySettingsPage() {
  const s = await getMaskedSettings("security");

  return (
    <div>
      <PageHeader title="Security" description="Tenant creation and session policy hints" />
      <Card>
        <form action={savePlatformSettings} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="key" value="security" />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="requireEmailVerifyBeforeTenant"
              defaultChecked={Boolean(s.requireEmailVerifyBeforeTenant)}
            />
            Require email verification before creating a tenant
          </label>
          <div>
            <Label>Session idle hint (minutes)</Label>
            <Input
              name="sessionIdleMinutes"
              type="number"
              defaultValue={String(s.sessionIdleMinutes ?? 480)}
            />
          </div>
          <div>
            <Button type="submit">Save</Button>
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
