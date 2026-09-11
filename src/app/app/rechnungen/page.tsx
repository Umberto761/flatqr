import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requirePageUser } from "@/lib/auth";
import { listInvoices } from "@/lib/db";
import { formatDeDate } from "@/lib/invoice";
import { formatCHF } from "@/lib/money";

export default async function InvoicesPage() {
  const email = await requirePageUser();
  const invoices = await listInvoices();

  return (
    <AppShell email={email}>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Rechnungen</h1>
        <p className="text-sm text-muted-foreground">Entwürfe und erzeugte QR-PDFs.</p>
      </div>
      {invoices.length === 0 ? (
        <p className="border border-dashed border-[#c5c9d0] bg-white p-6 text-sm text-muted-foreground">
          Noch keine Rechnung. Zuerst Zeiten importieren.
        </p>
      ) : (
        <table className="ledger w-full border border-[#c5c9d0] bg-white text-sm">
          <thead className="bg-[#0d1b2a] text-[#f2f3f5]">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Nummer</th>
              <th className="px-3 py-2 text-left font-medium">Kunde</th>
              <th className="px-3 py-2 text-left font-medium">Datum</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-[#e6e8ec]">
                <td className="px-3 py-2">
                  <Link href={`/app/rechnungen/${invoice.id}`} className="underline">
                    {invoice.number}
                  </Link>
                  {invoice.usingSampleCreditor ? (
                    <span className="ml-2 text-xs text-destructive">Muster-IBAN</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">{invoice.clientName}</td>
                <td className="px-3 py-2">{formatDeDate(invoice.issueDate)}</td>
                <td className="px-3 py-2 text-right">{formatCHF(invoice.grossTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
