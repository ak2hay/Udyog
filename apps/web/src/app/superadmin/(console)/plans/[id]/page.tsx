import { getPlanDetail, savePlan } from "@/app/actions/platform";
import { Button, Card, Input, Label, PageHeader, Select, Textarea } from "@/components/ui";
import { MODULES } from "@rkyves/shared";
import Link from "next/link";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === "new";
  const detail = isNew ? null : await getPlanDetail(id);
  const plan = detail?.plan;
  const modules = new Set(detail?.modules ?? []);

  return (
    <div>
      <PageHeader title={isNew ? "New plan" : `Edit ${plan?.name}`} description="Pricing and module pack" />
      <Card>
        <form action={savePlan} className="grid gap-4 sm:grid-cols-2">
          {!isNew ? <input type="hidden" name="id" value={plan!.id} /> : null}
          <div>
            <Label>Code</Label>
            <Input name="code" defaultValue={plan?.code} required disabled={!isNew} />
          </div>
          <div>
            <Label>Name</Label>
            <Input name="name" defaultValue={plan?.name} required />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea name="description" defaultValue={plan?.description || ""} rows={2} />
          </div>
          <div>
            <Label>Price (INR)</Label>
            <Input
              name="priceRupees"
              type="number"
              step="0.01"
              defaultValue={plan ? plan.pricePaise / 100 : 0}
            />
          </div>
          <div>
            <Label>Interval</Label>
            <Select name="interval" defaultValue={plan?.interval || "month"}>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </Select>
          </div>
          <div>
            <Label>Max users</Label>
            <Input name="maxUsers" type="number" defaultValue={plan?.maxUsers ?? 5} />
          </div>
          <div>
            <Label>Max branches</Label>
            <Input name="maxBranches" type="number" defaultValue={plan?.maxBranches ?? 1} />
          </div>
          <div>
            <Label>Sort order</Label>
            <Input name="sortOrder" type="number" defaultValue={plan?.sortOrder ?? 0} />
          </div>
          <div>
            <Label>Currency</Label>
            <Input name="currency" defaultValue={plan?.currency || "INR"} />
          </div>
          <div className="flex items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isPublic" defaultChecked={plan?.isPublic ?? true} />
              Public
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={plan?.isActive ?? true} />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="syncRazorpay" />
              Sync to Razorpay
            </label>
          </div>
          <div className="sm:col-span-2">
            <Label>Modules</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MODULES.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={`module_${m}`} defaultChecked={modules.has(m)} />
                  {m}
                </label>
              ))}
            </div>
          </div>
          {plan?.razorpayPlanId ? (
            <p className="sm:col-span-2 text-xs text-[var(--color-muted)]">
              Razorpay plan: {plan.razorpayPlanId}
            </p>
          ) : null}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">Save plan</Button>
            <Link href="/superadmin/plans">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
