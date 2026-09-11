"use client";

import { useState } from "react";
import type { IbanInfo, SellerSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SettingsForm({
  initial,
  initialIban,
}: {
  initial: SellerSettings;
  initialIban: IbanInfo;
}) {
  const [settings, setSettings] = useState(initial);
  const [ibanInfo, setIbanInfo] = useState(initialIban);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof SellerSettings>(key: K, value: SellerSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="space-y-4 border border-[#c5c9d0] bg-white p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        setStatus(null);
        const response = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        const payload = await response.json();
        setPending(false);
        if (!response.ok) {
          setError(payload.error ?? "Speichern fehlgeschlagen.");
          return;
        }
        setSettings(payload.settings);
        setIbanInfo(payload.iban);
        setStatus("Gespeichert.");
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" value={settings.name} onChange={(v) => set("name", v)} />
        <Field label="E-Mail" value={settings.email} onChange={(v) => set("email", v)} />
        <Field label="Strasse" value={settings.address} onChange={(v) => set("address", v)} />
        <Field
          label="Hausnummer"
          value={settings.buildingNumber}
          onChange={(v) => set("buildingNumber", v)}
        />
        <Field label="PLZ" value={settings.zip} onChange={(v) => set("zip", v)} />
        <Field label="Ort" value={settings.city} onChange={(v) => set("city", v)} />
        <Field label="Land" value={settings.country} onChange={(v) => set("country", v)} />
        <Field label="Telefon" value={settings.phone} onChange={(v) => set("phone", v)} />
        <Field
          label="MWST-Nr."
          value={settings.vatNumber}
          onChange={(v) => set("vatNumber", v)}
        />
        <Field label="IBAN / QR-IBAN" value={settings.iban} onChange={(v) => set("iban", v)} />
        <Field
          label="Default-Ansatz CHF"
          type="number"
          value={String(settings.defaultHourlyRate)}
          onChange={(v) => set("defaultHourlyRate", Number(v) || 0)}
        />
        <Field
          label="Zahlungsfrist (Tage)"
          type="number"
          value={String(settings.paymentDays)}
          onChange={(v) => set("paymentDays", Number(v) || 0)}
        />
        <Field
          label="Rechnungspräfix"
          value={settings.invoicePrefix}
          onChange={(v) => set("invoicePrefix", v)}
        />
      </div>

      {ibanInfo.sample ? (
        <Alert>
          <AlertTitle>Musterkonto</AlertTitle>
          <AlertDescription>
            Das ist die offizielle SIX-Beispiel-QR-IBAN. PDFs sind gültig als Muster, aber
            nicht zahlbar auf dein Konto.
          </AlertDescription>
        </Alert>
      ) : (
        <p className="text-xs text-muted-foreground">
          {ibanInfo.valid
            ? ibanInfo.qrIban
              ? "QR-IBAN erkannt — Referenztyp QRR."
              : "IBAN erkannt — Referenztyp SCOR."
            : "IBAN-Prüfziffer sieht ungültig aus. PDF-Erzeugung kann scheitern."}
        </p>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {status ? <p className="text-sm">{status}</p> : null}
      <Button type="submit" disabled={pending} className="bg-black text-white">
        {pending ? "Speichern…" : "Einstellungen speichern"}
      </Button>
    </form>
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
