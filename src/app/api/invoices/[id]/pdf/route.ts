import { fail, withUser } from "@/lib/api";
import { getInvoice, getSettings } from "@/lib/db";
import { renderInvoicePdf } from "@/lib/pdf";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await withUser();
  if (user instanceof Response) return user;
  const { id } = await context.params;
  const invoice = await getInvoice(id);
  if (!invoice) return fail("Rechnung nicht gefunden.", 404);
  const settings = await getSettings();

  try {
    const pdf = await renderInvoicePdf(invoice, settings);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "PDF konnte nicht erzeugt werden.",
      500,
    );
  }
}
