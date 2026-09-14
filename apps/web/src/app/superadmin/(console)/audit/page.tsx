import { listAuditLogs } from "@/app/actions/platform";
import { DataTable, PageHeader } from "@/components/ui";

export default async function AuditPage() {
  const rows = await listAuditLogs();

  return (
    <div>
      <PageHeader title="Platform audit" description="Tenant, plan, settings, and impersonation events" />
      <DataTable
        headers={["When", "Actor", "Action", "Target", "Meta"]}
        rows={rows.map(({ log, actorEmail }) => [
          new Date(log.createdAt).toLocaleString(),
          actorEmail || "—",
          log.action,
          `${log.targetType}${log.targetId ? `:${log.targetId.slice(0, 8)}` : ""}`,
          log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : "—",
        ])}
      />
    </div>
  );
}
