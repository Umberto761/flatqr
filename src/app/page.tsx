import { AppShell } from "@/components/app-shell";
import { LoginForm } from "@/components/login-form";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await currentUser();
  if (user) redirect("/app");
  const params = await searchParams;

  return (
    <AppShell>
      <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-start">
        <section className="space-y-4">
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Beta · Basel
          </p>
          <h1 className="max-w-xl text-3xl font-semibold leading-tight">
            Harvest macht Zeiten.
            <br />
            Hier kommt die Swiss-QR-Rechnung.
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            CSV rein, Timesheet prüfen, PDF mit Empfangsschein und Zahlteil raus.
            CH-MwSt 8.1 / 2.6 / 0. Kein ERP, kein Harvest-Klon, kein bexio.
          </p>
          <ol className="max-w-xl space-y-2 text-sm">
            <li>
              <strong>1. Import</strong> — Harvest Detailed Time Report oder Export all time.
            </li>
            <li>
              <strong>2. Prüfen</strong> — Stunden, Ansatz und MwSt-Satz pro Zeile.
            </li>
            <li>
              <strong>3. QR-PDF</strong> — Rechnung auf Deutsch, zahlbar bis, Betrag, MwSt.
            </li>
          </ol>
        </section>
        <section className="border border-[#c5c9d0] bg-white p-5">
          <h2 className="mb-3 text-base font-semibold">Beta-Zugang</h2>
          <LoginForm nextPath={params.next || "/app"} />
        </section>
      </div>
    </AppShell>
  );
}
