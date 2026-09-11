import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { SwissMark } from "@/components/swiss-mark";

export function AppShell({
  email,
  children,
}: {
  email?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-[#c5c9d0] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href={email ? "/app" : "/"} className="flex items-center gap-2">
            <SwissMark />
            <span className="text-sm font-semibold tracking-wide">FlatQR</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Werkstatt · Basel
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {email ? (
              <>
                <Link href="/app" className="hover:underline">
                  Zeiten
                </Link>
                <Link href="/app/rechnungen" className="hover:underline">
                  Rechnungen
                </Link>
                <Link href="/app/einstellungen" className="hover:underline">
                  Einstellungen
                </Link>
                <LogoutButton />
              </>
            ) : (
              <Link href="/impressum" className="text-muted-foreground hover:underline">
                Impressum
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-[#c5c9d0] px-4 py-4 text-xs text-muted-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 sm:flex-row sm:justify-between">
          <p>Joel Baumann · In den Klosterreben 48 · 4052 Basel</p>
          <p>
            <Link href="/impressum" className="underline">
              Impressum
            </Link>
            {" · "}
            Kein ERP · Beta
          </p>
        </div>
      </footer>
    </div>
  );
}
