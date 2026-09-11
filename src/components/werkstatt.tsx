"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EXPECTED_COLUMNS, type TimeEntry } from "@/lib/csv";
import { formatCHF, formatHours } from "@/lib/money";
import { addDays, todayIso } from "@/lib/invoice";
import { VAT_RATES } from "@/lib/vat";
import { lineAmounts } from "@/lib/vat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function Werkstatt({
  initialEntries,
  settings,
}: {
  initialEntries: TimeEntry[];
  settings: SettingsPayload;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ImportMeta>({});
  const [grouping, setGrouping] = useState<"task" | "entry">("task");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientBuilding, setClientBuilding] = useState("");
  const [clientZip, setClientZip] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientCountry, setClientCountry] = useState("CH");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(
    addDays(todayIso(), settings.settings.paymentDays),
  );
  const [notes, setNotes] = useState("Zahlbar innert 30 Tagen netto.");

  useEffect(() => {
    const selected = entries.filter((e) => e.selected);
    const clients = [...new Set(selected.map((e) => e.client).filter(Boolean))];
    if (clients.length === 1 && !clientName) setClientName(clients[0]);
  }, [entries, clientName]);

  const selected = entries.filter((e) => e.selected);
  const preview = useMemo(() => {
    const lines = selected.map((entry) =>
      lineAmounts(entry.hours, entry.billableRate, entry.vatRate),
    );
    const net = lines.reduce((s, l) => s + l.net, 0);
    const vat = lines.reduce((s, l) => s + l.vat, 0);
    return { hours: selected.reduce((s, e) => s + e.hours, 0), net, vat, gross: net + vat };
  }, [selected]);

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
      setEntries(payload.entries);
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

  function patch(id: string, patch: Partial<TimeEntry>) {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
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
    <div className="space-y-6">
      <section className="grid gap-4 border border-[#c5c9d0] bg-white p-4 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">Harvest-CSV → Swiss QR-Rechnung</h1>
          <p className="text-sm text-muted-foreground">
            Detaillierter Zeitreport oder «Export all time». Komma- oder Semikolon-CSV,
            englische und deutsche Spaltennamen.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="inline-flex cursor-pointer items-center justify-center border border-[#111] bg-black px-3 py-2 text-sm text-white">
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
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void upload("demo")}
            >
              Demo-CSV laden
            </Button>
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
        <section className="overflow-x-auto border border-[#c5c9d0] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[#c5c9d0] px-3 py-2 text-sm">
            <p>
              {selected.length} von {entries.length} Zeilen · {formatHours(preview.hours)} Std.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setEntries((current) => current.map((e) => ({ ...e, selected: e.billable })))
                }
              >
                Nur abrechenbar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setEntries((current) => current.map((e) => ({ ...e, selected: true })))
                }
              >
                Alle
              </Button>
            </div>
          </div>
          <table className="ledger w-full min-w-[880px] text-left text-xs">
            <thead className="bg-[#0d1b2a] text-[#f2f3f5]">
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
                const amounts = lineAmounts(entry.hours, entry.billableRate, entry.vatRate);
                return (
                  <tr key={entry.id} className="border-t border-[#e6e8ec] align-top">
                    <td className="px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={entry.selected}
                        onChange={(e) => patch(entry.id, { selected: e.target.checked })}
                      />
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{entry.date}</td>
                    <td className="px-2 py-1.5">
                      <input
                        className="w-full border-0 bg-transparent"
                        value={entry.client}
                        onChange={(e) => patch(entry.id, { client: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className="mb-1 w-full border-0 bg-transparent font-medium"
                        value={entry.project}
                        onChange={(e) => patch(entry.id, { project: e.target.value })}
                      />
                      <input
                        className="w-full border-0 bg-transparent text-muted-foreground"
                        value={entry.task}
                        onChange={(e) => patch(entry.id, { task: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        className="w-16 border-0 bg-transparent"
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
                        className="w-20 border-0 bg-transparent"
                        value={entry.billableRate}
                        onChange={(e) =>
                          patch(entry.id, { billableRate: Number(e.target.value) || 0 })
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
        </section>
      )}

      <section className="grid gap-4 border border-[#c5c9d0] bg-white p-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Rechnung an</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kunde" value={clientName} onChange={setClientName} />
            <Field label="Land" value={clientCountry} onChange={setClientCountry} />
            <Field label="Strasse" value={clientAddress} onChange={setClientAddress} />
            <Field label="Nr." value={clientBuilding} onChange={setClientBuilding} />
            <Field label="PLZ" value={clientZip} onChange={setClientZip} />
            <Field label="Ort" value={clientCity} onChange={setClientCity} />
            <Field label="Datum" type="date" value={issueDate} onChange={setIssueDate} />
            <Field label="Zahlbar bis" type="date" value={dueDate} onChange={setDueDate} />
          </div>
          <div className="space-y-1.5">
            <Label>Bemerkung</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <div className="space-y-3 border border-[#e6e8ec] bg-[#f2f3f5] p-3">
          <div className="space-y-1.5">
            <Label>Positionen</Label>
            <Select
              value={grouping}
              onValueChange={(value) => setGrouping(value as "task" | "entry")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Pro Projekt / Aufgabe</SelectItem>
                <SelectItem value="entry">Jede Zeile einzeln</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <dl className="ledger space-y-1 text-sm">
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
          <Button
            type="button"
            disabled={busy || selected.length === 0}
            className="w-full bg-black text-white"
            onClick={() => void createInvoice()}
          >
            {busy ? "Erzeuge…" : "QR-Rechnung erstellen"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
