import { listPaymentEvents } from "@/app/actions/platform";
import { Badge, DataTable, PageHeader } from "@/components/ui";

export default async function BillingOpsPage() {
  const events = await listPaymentEvents();

  return (
    <div>
      <PageHeader
        title="Billing ops"
        description="Razorpay webhook events and processing status"
      />
      <DataTable
        headers={["Event", "Type", "Processed", "Error", "Created"]}
        rows={events.map((e) => [
          e.eventId,
          e.eventType,
          e.processedAt ? <Badge tone="success">yes</Badge> : <Badge tone="warning">pending</Badge>,
          e.error ? <Badge tone="danger">{e.error.slice(0, 40)}</Badge> : "—",
          new Date(e.createdAt).toLocaleString(),
        ])}
      />
    </div>
  );
}
