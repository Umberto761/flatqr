import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function ImpressumPage() {
  return (
    <AppShell>
      <article className="max-w-xl space-y-4 border border-[#c5c9d0] bg-white p-5 text-sm leading-6">
        <h1 className="text-xl font-semibold">Impressum</h1>
        <p>
          Joel Baumann
          <br />
          In den Klosterreben 48
          <br />
          4052 Basel
          <br />
          Schweiz
        </p>
        <p>
          E-Mail:{" "}
          <a className="underline" href="mailto:shopnordcart@gmail.com">
            shopnordcart@gmail.com
          </a>
        </p>
        <p>
          FlatQR ist ein Werkzeug für den Rechnungs-Schritt nach Harvest. Es ist kein
          ERP und keine Buchhaltung.
        </p>
        <p>
          Marketing:{" "}
          <a className="underline" href="https://flatqr-ch.surge.sh">
            flatqr-ch.surge.sh
          </a>
        </p>
        <p>
          <Link href="/" className="underline">
            Zurück
          </Link>
        </p>
      </article>
    </AppShell>
  );
}
