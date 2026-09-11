import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function NotFound() {
  return (
    <AppShell>
      <p className="text-sm">
        Seite nicht gefunden.{" "}
        <Link href="/" className="underline">
          Zur Startseite
        </Link>
      </p>
    </AppShell>
  );
}
