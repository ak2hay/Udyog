import { brand } from "@rkyves/shared";
import { createTenant, joinDemoTenant } from "@/app/actions/onboarding";
import { requireSession } from "@/lib/session";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";

export default async function OnboardingPage() {
  await requireSession();

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <PageHeader
        title={`Welcome to ${brand.name}`}
        description="Set up your manufacturing company to get started."
      />
      <Card className="mb-4">
        <form action={joinDemoTenant}>
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            Prefer the seeded Precision Parts India demo (items, BOM, stock)? Run{" "}
            <code className="rounded bg-[var(--color-surface)] px-1">pnpm db:seed</code> first if
            join fails.
          </p>
          <Button type="submit" variant="secondary" className="w-full">
            Join demo tenant
          </Button>
        </form>
      </Card>
      <Card>
        <form action={createTenant} className="grid gap-4">
          <div>
            <Label>Company name</Label>
            <Input name="name" placeholder="Precision Parts India" required />
          </div>
          <div>
            <Label>Legal name</Label>
            <Input name="legalName" placeholder="Precision Parts India Pvt Ltd" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>GSTIN</Label>
              <Input name="gstin" />
            </div>
            <div>
              <Label>City</Label>
              <Input name="city" />
            </div>
          </div>
          <div>
            <Label>State</Label>
            <Input name="state" />
          </div>
          <Button type="submit">Create company & continue</Button>
        </form>
      </Card>
    </div>
  );
}
