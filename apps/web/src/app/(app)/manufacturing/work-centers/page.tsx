import { createWorkCenter, listWorkCenters } from "@/app/actions/masters";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader } from "@/components/ui";

export default async function WorkCentersPage() {
  const rows = await listWorkCenters();

  return (
    <div>
      <PageHeader title="Work centers" description="Machines and stations used on job cards" />
      <Card className="mb-8">
        <form action={createWorkCenter} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Code</Label>
            <Input name="code" required placeholder="WC-CNC-01" />
          </div>
          <div>
            <Label>Name</Label>
            <Input name="name" required placeholder="CNC Lathe 1" />
          </div>
          <div>
            <Label>Machine</Label>
            <Input name="machineName" />
          </div>
          <div>
            <Label>Capacity / hour</Label>
            <Input name="capacityPerHour" type="number" step="0.01" />
          </div>
          <div>
            <Button type="submit">Add work center</Button>
          </div>
        </form>
      </Card>
      <DataTable
        headers={["Code", "Name", "Machine", "Capacity/hr", "Status"]}
        rows={rows.map((r) => [
          r.code,
          r.name,
          r.machineName || "—",
          r.capacityPerHour || "—",
          <Badge key={r.id} tone={r.isActive ? "success" : "danger"}>
            {r.isActive ? "Active" : "Inactive"}
          </Badge>,
        ])}
      />
    </div>
  );
}
