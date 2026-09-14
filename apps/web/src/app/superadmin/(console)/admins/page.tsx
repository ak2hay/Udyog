import { addPlatformAdmin, listPlatformAdmins, removePlatformAdmin } from "@/app/actions/platform";
import { Button, Card, DataTable, Input, Label, PageHeader } from "@/components/ui";
import { parseSuperAdminEmails } from "@/lib/platform";

export default async function AdminsPage() {
  const admins = await listPlatformAdmins();
  const envEmails = parseSuperAdminEmails();

  return (
    <div>
      <PageHeader title="Platform admins" description="Users who can access /superadmin" />

      {envEmails.length > 0 ? (
        <Card className="mb-6 text-sm">
          <p className="font-medium">Env allowlist (SUPER_ADMIN_EMAILS)</p>
          <p className="mt-1 text-[var(--color-muted)]">{envEmails.join(", ")}</p>
        </Card>
      ) : null}

      <DataTable
        headers={["Name", "Email", "Added", ""]}
        rows={admins.map(({ admin, user }) => [
          user.name,
          user.email,
          new Date(admin.createdAt).toLocaleString(),
          <form key="r" action={removePlatformAdmin}>
            <input type="hidden" name="adminId" value={admin.id} />
            <Button type="submit" variant="danger">
              Remove
            </Button>
          </form>,
        ])}
      />

      <Card className="mt-8">
        <h2 className="font-semibold">Add admin</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">User must already have signed up.</p>
        <form action={addPlatformAdmin} className="mt-4 flex max-w-md gap-2">
          <div className="flex-1">
            <Label>Email</Label>
            <Input name="email" type="email" required />
          </div>
          <div className="flex items-end">
            <Button type="submit">Grant access</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
