import {
  createExpense,
  createPayment,
  createPurchaseInvoice,
  listPayments,
  listPurchaseInvoices,
  listPurchaseOrdersFin,
} from "@/app/actions/finance";
import { Badge, Button, Card, DataTable, Input, Label, PageHeader, Select } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function PayablesPage() {
  const [invoices, payments, pos] = await Promise.all([
    listPurchaseInvoices(),
    listPayments(),
    listPurchaseOrdersFin(),
  ]);
  const open = invoices.filter((i) => Number(i.totalAmount) > Number(i.paidAmount || 0));

  return (
    <div>
      <PageHeader title="Payables" description="Supplier invoices, payments, expenses" />
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-3 font-medium">Create purchase invoice from PO</p>
          <form action={createPurchaseInvoice} className="grid gap-3">
            <div>
              <Label>PO</Label>
              <Select name="purchaseOrderId" required>
                {pos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.number} · {formatMoney(p.totalAmount)}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Create PI</Button>
          </form>
        </Card>
        <Card>
          <p className="mb-3 font-medium">Record payment</p>
          <form action={createPayment} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Invoice</Label>
              <Select name="purchaseInvoiceId" required>
                {open.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.number}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input name="amount" required />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Pay</Button>
            </div>
          </form>
        </Card>
      </div>
      <Card className="mb-6">
        <p className="mb-3 font-medium">Expense</p>
        <form action={createExpense} className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Category</Label>
            <Input name="category" defaultValue="Factory" required />
          </div>
          <div>
            <Label>Description</Label>
            <Input name="description" required />
          </div>
          <div>
            <Label>Amount</Label>
            <Input name="amount" required />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" variant="secondary">
              Post expense
            </Button>
          </div>
        </form>
      </Card>
      <DataTable
        headers={["PI Number", "Total", "Paid", "Outstanding", "Status"]}
        rows={invoices.map((i) => [
          i.number,
          formatMoney(i.totalAmount),
          formatMoney(i.paidAmount),
          formatMoney(Number(i.totalAmount) - Number(i.paidAmount || 0)),
          <Badge key={i.id}>{i.status}</Badge>,
        ])}
      />
      <div className="mt-8">
        <PageHeader title="Payments" />
        <DataTable
          headers={["Number", "Date", "Amount"]}
          rows={payments.map((p) => [p.number, p.paymentDate, formatMoney(p.amount)])}
        />
      </div>
    </div>
  );
}
