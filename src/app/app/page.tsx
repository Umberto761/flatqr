import { AppShell } from "@/components/app-shell";
import { Werkstatt } from "@/components/werkstatt";
import { requirePageUser } from "@/lib/auth";
import { getSettings, listEntries } from "@/lib/db";
import { describeIban } from "@/lib/qr";

export default async function AppPage() {
  const email = await requirePageUser();
  const [entries, settings] = await Promise.all([listEntries(), getSettings()]);

  return (
    <AppShell email={email}>
      <Werkstatt
        initialEntries={entries}
        settings={{ settings, iban: describeIban(settings.iban) }}
      />
    </AppShell>
  );
}
