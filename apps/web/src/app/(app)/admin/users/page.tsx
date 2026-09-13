import { listMembers, inviteUser, updateMemberRole, setMemberActive } from "@/app/actions/admin";
import { ROLES } from "@rkyves/shared";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader, Select } from "@/components/ui";

export default async function AdminUsersPage() {
  const members = await listMembers();

  return (
    <div>
      <PageHeader title="Users & roles" description="Invite teammates and assign module roles" />
      <Card className="mb-8">
        <form action={inviteUser} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Full name</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <Label>Temp password</Label>
            <Input name="password" type="password" minLength={8} required />
          </div>
          <div>
            <Label>Role</Label>
            <Select name="role" defaultValue="sales">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Designation</Label>
            <Input name="designation" placeholder="Sales Manager" />
          </div>
          <div className="flex items-end">
            <Button type="submit">Invite user</Button>
          </div>
        </form>
      </Card>
      <DataTable
        headers={["Name", "Email", "Role", "Status", "Actions"]}
        rows={members.map((m) => [
          m.name,
          m.email,
          <form key={`role-${m.membershipId}`} action={updateMemberRole} className="flex gap-2">
            <input type="hidden" name="membershipId" value={m.membershipId} />
            <Select name="role" defaultValue={m.role} className="max-w-[140px]">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary">
              Save
            </Button>
          </form>,
          <Badge key={`st-${m.membershipId}`} tone={m.isActive ? "success" : "danger"}>
            {m.isActive ? "Active" : "Inactive"}
          </Badge>,
          <form key={`act-${m.membershipId}`} action={setMemberActive}>
            <input type="hidden" name="membershipId" value={m.membershipId} />
            <input type="hidden" name="isActive" value={m.isActive ? "false" : "true"} />
            <Button type="submit" variant="ghost">
              {m.isActive ? "Deactivate" : "Activate"}
            </Button>
          </form>,
        ])}
      />
    </div>
  );
}
