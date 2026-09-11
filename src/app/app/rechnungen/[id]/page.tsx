import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requirePageUser } from "@/lib/auth";
import { getInvoice } from "@/lib/db";
import { formatDeDate } from "@/lib/invoice";
import { formatCHF, formatHours } from "@/lib/money";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const email = await requirePageUser();
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  return (
    <AppShell email={email}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/app/rechnungen" className="underline">
              Rechnungen
            </Link>
          </p>
          <h1 className="text-xl font-semibold">Rechnung {invoice.number}</h1>
          <p className="text-sm text-muted-foreground">
            {invoice.clientName} · {formatDeDate(invoice.issueDate)} · zahlbar bis{" "}
            {formatDeDate(invoice.dueDate)}
          </p>
        </div>
        <Button asChild className="bg-black text-white">
          <a href={`/api/invoices/${invoice.id}/pdf`}>QR-PDF herunterladen</a>
        </Button>
      </div>

      {invoice.usingSampleCreditor ? (
        <Alert className="mb-4">
          <AlertTitle>Muster-Gläubigerdaten</AlertTitle>
          <AlertDescription>
            Diese PDF benutzt die SIX-Beispiel-QR-IBAN. Nicht an Kunden senden.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-x-auto border border-[#c5c9d0] bg-white">
        <table className="ledger w-full text-sm">
          <thead className="bg-[#0d1b2a] text-[#f2f3f5]">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Pos.</th>
              <th className="px-3 py-2 text-left font-medium">Bezeichnung</th>
              <th className="px-3 py-2 text-right font-medium">Std.</th>
              <th className="px-3 py-2 text-right font-medium">Ansatz</th>
              <th className="px-3 py-2 text-right font-medium">MwSt</th>
              <th className="px-3 py-2 text-right font-medium">Netto</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, index) => (
              <tr key={line.id} className="border-t border-[#e6e8ec]">
                <td className="px-3 py-2">{index + 1}</td>
                <td className="px-3 py-2">{line.description}</td>
                <td className="px-3 py-2 text-right">{formatHours(line.hours)}</td>
                <td className="px-3 py-2 text-right">{formatCHF(line.unitPrice)}</td>
                <td className="px-3 py-2 text-right">{line.vatRate.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right">{formatCHF(line.net)}</td>
              </tr>
            ))}
            <tr className="border-t border-[#c5c9d0]">
              <td colSpan={5} className="px-3 py-2 text-right">
                MwSt
              </td>
              <td className="px-3 py-2 text-right">{formatCHF(invoice.vatTotal)}</td>
            </tr>
            <tr className="bg-[#e6e8ec] font-semibold">
              <td colSpan={5} className="px-3 py-2 text-right">
                Total
              </td>
              <td className="px-3 py-2 text-right">{formatCHF(invoice.grossTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Referenz {invoice.reference}
      </p>
    </AppShell>
  );
}
