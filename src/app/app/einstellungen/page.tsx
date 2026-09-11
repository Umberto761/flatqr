import { AppShell } from "@/components/app-shell";
import { SettingsForm } from "@/components/settings-form";
import { requirePageUser } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import { describeIban } from "@/lib/qr";

export default async function SettingsPage() {
  const email = await requirePageUser();
  const settings = await getSettings();

  return (
    <AppShell email={email}>
      <div className="mb-4 space-y-1">
        <h1 className="text-xl font-semibold">Gläubiger</h1>
        <p className="text-sm text-muted-foreground">
          Diese Daten stehen auf der Rechnung und im Zahlteil. IBAN leer oder
          SIX-Beispiel = Musterdaten-Hinweis auf dem PDF.
        </p>
      </div>
      <SettingsForm initial={settings} initialIban={describeIban(settings.iban)} />
    </AppShell>
  );
}
