"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EXPECTED_COLUMNS, type TimeEntry } from "@/lib/csv";
import { addressForClient } from "@/lib/clients";
import { formatCHF, formatHours } from "@/lib/money";
import { addDays, todayIso } from "@/lib/invoice";
import { VAT_RATES, lineAmounts } from "@/lib/vat";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SettingsPayload {
  settings: {
    defaultHourlyRate: number;
    paymentDays: number;
    iban: string;
    name: string;
  };
  iban: { valid: boolean; qrIban: boolean; sample: boolean };
}

type ImportMeta = {
  format?: string;
  warnings?: { row: number; message: string }[];
  detectedColumns?: string[];
};

function uniqueClients(entries: TimeEntry[]): string[] {
  return [...new Set(entries.map((entry) => entry.client).filter(Boolean))];
}

function selectClient(entries: TimeEntry[], client: string | "all"): TimeEntry[] {
  return entries.map((entry) => ({
    ...entry,
    selected:
      client === "all" ? entry.billable : entry.client === client && entry.billable,
  }));
}

export function Werkstatt({
  initialEntries,
  settings,
}: {
  initialEntries: TimeEntry[];
  settings: SettingsPayload;
}) {
  const router = useRouter();
  const startingClients = uniqueClients(initialEntries);
  const startingClient = startingClients[0] ?? "";
  const startingAddress = addressForClient(startingClient);

  const [entries, setEntries] = useState(() =>
    startingClient ? selectClient(initialEntries, startingClient) : initialEntries,
  );
  const [focusClient, setFocusClient] = useState(startingClient);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ImportMeta>({});
  const [grouping, setGrouping] = useState<"task" | "entry">("task");
  const [clientName, setClientName] = useState(startingAddress.name);
  const [clientAddress, setClientAddress] = useState(startingAddress.address);
  const [clientBuilding, setClientBuilding] = useState(startingAddress.building);
  const [clientZip, setClientZip] = useState(startingAddress.zip);
  const [clientCity, setClientCity] = useState(startingAddress.city);
  const [clientCountry, setClientCountry] = useState(startingAddress.country || "CH");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(
    addDays(todayIso(), settings.settings.paymentDays),
  );
  const [notes, setNotes] = useState("Zahlbar innert 30 Tagen netto.");

  const clients = uniqueClients(entries);
  const selected = entries.filter((entry) => entry.selected);
  const preview = useMemo(() => {
    const lines = selected.map((entry) =>
      lineAmounts(entry.hours, entry.billableRate, entry.vatRate),
    );
    const net = lines.reduce((sum, line) => sum + line.net, 0);
    const vat = lines.reduce((sum, line) => sum + line.vat, 0);
    return {
      hours: selected.reduce((sum, entry) => sum + entry.hours, 0),
      net,
      vat,
      gross: net + vat,
    };
  }, [selected]);

  function applyDebtor(name: string) {
    const next = addressForClient(name);
    setFocusClient(name);
    setClientName(next.name);
    setClientAddress(next.address);
    setClientBuilding(next.building);
    setClientZip(next.zip);
    setClientCity(next.city);
    setClientCountry(next.country);
  }

  function focus(name: string | "all") {
    setEntries((current) => selectClient(current, name));
    if (name !== "all") applyDebtor(name);
  }

  async function upload(file: File | "demo") {
    setBusy(true);
    setError(null);
    try {
      let response: Response;
      if (file === "demo") {
        response = await fetch("/api/imports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demo: true }),
        });
      } else {
        const form = new FormData();
        form.set("file", file);
        response = await fetch("/api/imports", { method: "POST", body: form });
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Import fehlgeschlagen.");
      const imported = payload.entries as TimeEntry[];
      const first = uniqueClients(imported)[0] ?? "";
      setEntries(first ? selectClient(imported, first) : imported);
      if (first) applyDebtor(first);
      setMeta({
        format: payload.format,
        warnings: payload.warnings,
        detectedColumns: payload.detectedColumns,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  function patch(id: string, next: Partial<TimeEntry>) {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...next } : entry)),
    );
  }

  async function createInvoice() {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientAddress,
          clientBuilding,
          clientZip,
          clientCity,
          clientCountry,
          issueDate,
          dueDate,
          notes,
          grouping,
          entries: selected,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Rechnung fehlgeschlagen.");
      router.push(`/app/rechnungen/${payload.invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rechnung fehlgeschlagen.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 border border-[#c5c9d0] bg-white p-4 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">Harvest-CSV → Swiss QR-Rechnung</h1>
          <p className="text-sm text-muted-foreground">
            Detaillierter Zeitreport oder «Export all time». Komma- oder Semikolon-CSV,
            englische und deutsche Spaltennamen.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="inline-flex h-11 cursor-pointer items-center justify-center bg-black px-4 text-sm text-white">
              CSV wählen
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </label>
            <button
              type="button"
              disabled={busy}
              className="h-11 border border-[#111] px-4 text-sm disabled:opacity-50"
              onClick={() => void upload("demo")}
            >
              Demo-CSV laden
            </button>
          </div>
          {meta.format ? (
            <p className="text-xs text-muted-foreground">
              Erkannt: {meta.format}
              {meta.detectedColumns?.length
                ? ` · Spalten: ${meta.detectedColumns.join(", ")}`
                : ""}
            </p>
          ) : null}
        </div>
        <div className="space-y-2 text-xs">
          <p className="font-medium">Erwartete Spalten</p>
          <ul className="space-y-1 text-muted-foreground">
            {EXPECTED_COLUMNS.map((col) => (
              <li key={col.name}>
                <span className="text-foreground">{col.name}</span>
                {col.required ? " · Pflicht" : ""} — {col.note}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {settings.iban.sample ? (
        <Alert>
          <AlertTitle>Muster-IBAN aktiv</AlertTitle>
          <AlertDescription>
            Gläubiger ist {settings.settings.name}, die IBAN ist die SIX-Beispiel-QR-IBAN.
            Unter Einstellungen die echte Kontoverbindung eintragen, bevor eine Rechnung
            rausgeht.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {meta.warnings?.length ? (
        <Alert>
          <AlertTitle>Hinweise beim Import</AlertTitle>
          <AlertDescription>
            {meta.warnings.map((w) => `Zeile ${w.row}: ${w.message}`).join(" · ")}
          </AlertDescription>
        </Alert>
      ) : null}

      {entries.length === 0 ? (
        <div className="border border-dashed border-[#c5c9d0] bg-white p-8 text-sm text-muted-foreground">
          Noch keine Zeiten. CSV hochladen oder die Demo laden.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] lg:items-start">
          <section className="border border-[#c5c9d0] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c5c9d0] px-3 py-2 text-sm">
              <p>
                {selected.length} von {entries.length} Zeilen · {formatHours(preview.hours)}{" "}
                Std.
              </p>
              <div className="flex flex-wrap gap-1">
                {clients.map((client) => (
                  <button
                    key={client}
                    type="button"
                    onClick={() => focus(client)}
                    className={`h-8 px-2 text-xs ${
                      focusClient === client
                        ? "bg-[#0d1b2a] text-white"
                        : "border border-[#c5c9d0]"
                    }`}
                  >
                    {client}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => focus("all")}
                  className="h-8 border border-[#c5c9d0] px-2 text-xs"
                >
                  Alle
                </button>
              </div>
            </div>
            <div className="max-h-[520px] overflow-auto">
              <table className="ledger w-full min-w-[820px] text-left text-xs">
                <thead className="sticky top-0 bg-[#0d1b2a] text-[#f2f3f5]">
                  <tr>
                    <th className="px-2 py-2 font-medium"> </th>
                    <th className="px-2 py-2 font-medium">Datum</th>
                    <th className="px-2 py-2 font-medium">Kunde</th>
                    <th className="px-2 py-2 font-medium">Projekt / Aufgabe</th>
                    <th className="px-2 py-2 font-medium">Std.</th>
                    <th className="px-2 py-2 font-medium">Ansatz</th>
                    <th className="px-2 py-2 font-medium">MwSt</th>
                    <th className="px-2 py-2 font-medium">Netto</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const amounts = lineAmounts(
                      entry.hours,
                      entry.billableRate,
                      entry.vatRate,
                    );
                    return (
                      <tr key={entry.id} className="border-t border-[#e6e8ec] align-top">
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={entry.selected}
                            onChange={(e) =>
                              patch(entry.id, { selected: e.target.checked })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{entry.date}</td>
                        <td className="px-2 py-1.5">{entry.client}</td>
                        <td className="px-2 py-1.5">
                          <div className="font-medium">{entry.project}</div>
                          <div className="text-muted-foreground">{entry.task}</div>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            className="w-16 border border-transparent bg-transparent px-1"
                            value={entry.hours}
                            onChange={(e) =>
                              patch(entry.id, { hours: Number(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            className="w-20 border border-transparent bg-transparent px-1"
                            value={entry.billableRate}
                            onChange={(e) =>
                              patch(entry.id, {
                                billableRate: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            className="bg-transparent"
                            value={String(entry.vatRate)}
                            onChange={(e) =>
                              patch(entry.id, { vatRate: Number(e.target.value) })
                            }
                          >
                            <option value={VAT_RATES.normal}>8.1%</option>
                            <option value={VAT_RATES.reduced}>2.6%</option>
                            <option value={VAT_RATES.exempt}>0%</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {formatCHF(amounts.net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border border-[#c5c9d0] bg-white p-4 lg:sticky lg:top-4">
            <h2 className="mb-3 text-base font-semibold">Rechnung an</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Kunde" name="clientName" value={clientName} onChange={setClientName} />
              <Field label="Land" name="clientCountry" value={clientCountry} onChange={setClientCountry} />
              <Field label="Strasse" name="clientAddress" value={clientAddress} onChange={setClientAddress} />
              <Field label="Nr." name="clientBuilding" value={clientBuilding} onChange={setClientBuilding} />
              <Field label="PLZ" name="clientZip" value={clientZip} onChange={setClientZip} />
              <Field label="Ort" name="clientCity" value={clientCity} onChange={setClientCity} />
              <Field label="Datum" name="issueDate" type="date" value={issueDate} onChange={setIssueDate} />
              <Field label="Zahlbar bis" name="dueDate" type="date" value={dueDate} onChange={setDueDate} />
            </div>
            <label className="mt-3 block space-y-1.5 text-sm">
              <span className="font-medium">Bemerkung</span>
              <textarea
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-[#c5c9d0] px-3 py-2 text-sm outline-none focus:border-[#0d1b2a]"
              />
            </label>
            <label className="mt-3 block space-y-1.5 text-sm">
              <span className="font-medium">Positionen</span>
              <select
                value={grouping}
                onChange={(e) => setGrouping(e.target.value as "task" | "entry")}
                className="h-11 w-full border border-[#c5c9d0] bg-white px-3 text-sm"
              >
                <option value="task">Pro Projekt / Aufgabe</option>
                <option value="entry">Jede Zeile einzeln</option>
              </select>
            </label>
            <dl className="ledger mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Netto</dt>
                <dd>{formatCHF(preview.net)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>MwSt</dt>
                <dd>{formatCHF(preview.vat)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Total</dt>
                <dd>{formatCHF(preview.gross)}</dd>
              </div>
            </dl>
            <button
              type="button"
              disabled={busy || selected.length === 0 || !clientName.trim()}
              className="mt-4 h-11 w-full bg-black text-sm font-medium text-white disabled:opacity-50"
              onClick={() => void createInvoice()}
            >
              {busy ? "Erzeuge…" : "QR-Rechnung erstellen"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full border border-[#c5c9d0] bg-white px-3 text-sm outline-none focus:border-[#0d1b2a]"
      />
    </label>
  );
}
