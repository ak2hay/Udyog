import { getMaskedSettings, savePlatformSettings } from "@/app/actions/platform";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import Link from "next/link";

export default async function AppSettingsPage() {
  const s = await getMaskedSettings("app");

  return (
    <div>
      <PageHeader title="App settings" description="Public branding and signup defaults" />
      <Card>
        <form action={savePlatformSettings} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="key" value="app" />
          <div>
            <Label>Public name</Label>
            <Input name="publicName" defaultValue={String(s.publicName || "Rkyves")} />
          </div>
          <div>
            <Label>Support email</Label>
            <Input name="supportEmail" type="email" defaultValue={String(s.supportEmail || "")} />
          </div>
          <div>
            <Label>Default trial days</Label>
            <Input name="defaultTrialDays" type="number" defaultValue={String(s.defaultTrialDays ?? 14)} />
          </div>
          <label className="flex items-center gap-2 text-sm self-end">
            <input type="checkbox" name="signupOpen" defaultChecked={s.signupOpen !== false} />
            Signup open
          </label>
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
