import {
  createReceipt,
  listReceipts,
  listSalesInvoices,
} from "@/app/actions/finance";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader, Select } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function ReceivablesPage() {
  const [invoices, receipts] = await Promise.all([listSalesInvoices(), listReceipts()]);
  const open = invoices.filter((i) => Number(i.totalAmount) > Number(i.paidAmount || 0));

  return (
    <div>
      <PageHeader title="Receivables" description="Customer outstanding and receipts" />
      <Card className="mb-6">
        <form action={createReceipt} className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>Invoice</Label>
            <Select name="salesInvoiceId" required>
              {open.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.number} · due {formatMoney(Number(i.totalAmount) - Number(i.paidAmount || 0))}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Amount</Label>
            <Input name="amount" required />
          </div>
          <div>
            <Label>Mode</Label>
            <Select name="paymentMode" defaultValue="bank">
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </Select>
          </div>
          <div>
            <Label>Reference</Label>
            <Input name="reference" />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit">Record receipt</Button>
          </div>
        </form>
      </Card>
      <DataTable
        headers={["Invoice", "Total", "Paid", "Outstanding"]}
        rows={invoices.map((i) => [
          i.number,
          formatMoney(i.totalAmount),
          formatMoney(i.paidAmount),
          formatMoney(Number(i.totalAmount) - Number(i.paidAmount || 0)),
        ])}
      />
      <div className="mt-8">
        <PageHeader title="Receipts" />
        <DataTable
          headers={["Number", "Date", "Amount", "Mode"]}
          rows={receipts.map((r) => [
            r.number,
            r.receiptDate,
            formatMoney(r.amount),
            <Badge key={r.id}>{r.paymentMode}</Badge>,
          ])}
        />
      </div>
    </div>
  );
}
