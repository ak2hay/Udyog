import Link from "next/link";
import { listSalesInvoices } from "@/app/actions/finance";
import { Badge, DataTable, PageHeader } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function InvoicesPage() {
  const rows = await listSalesInvoices();
  return (
    <div>
      <PageHeader title="Sales invoices" description="GST-ready invoice documents" />
      <DataTable
        headers={["Number", "Date", "Total", "Paid", "Outstanding", "Status", ""]}
        rows={rows.map((r) => {
          const outstanding = Number(r.totalAmount) - Number(r.paidAmount || 0);
          return [
            r.number,
            r.invoiceDate,
            formatMoney(r.totalAmount),
            formatMoney(r.paidAmount),
            formatMoney(outstanding),
            <Badge key={r.id} tone={outstanding <= 0 ? "success" : "warning"}>
              {outstanding <= 0 ? "Settled" : r.status}
            </Badge>,
            <Link
              key={`p-${r.id}`}
              href={`/print/invoices/${r.id}`}
              className="text-sm text-[var(--color-accent)] underline"
              target="_blank"
            >
              Print
            </Link>,
          ];
        })}
      />
    </div>
  );
}
