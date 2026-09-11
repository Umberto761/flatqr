# FlatQR

Harvest-CSV → Timesheet prüfen → **deutsche Swiss QR-Rechnung** (Empfangsschein + Zahlteil) mit CH-MwSt. Kein ERP.

Operator: Joel Baumann, Basel. Marketing-Seite: [flatqr-ch.surge.sh](https://flatqr-ch.surge.sh).

## Lokal starten

```bash
npm install
cp .env.example .env.local   # optional; Default-Code ist flatqr-beta
npm test
npm run dev
```

Öffnen: [http://127.0.0.1:43127](http://127.0.0.1:43127)

1. E-Mail + Beta-Code `flatqr-beta`
2. **Demo-CSV laden** (oder eigene Harvest-Datei)
3. Kunde/Adresse ausfüllen, **QR-Rechnung erstellen**
4. PDF herunterladen

Demo-Datei: [`data/demo-harvest.csv`](data/demo-harvest.csv)

SQLite liegt in `data/flatqr.db` (wird angelegt).

## Harvest-CSV

Akzeptiert den **Detailed Time Report**, **Export all time** und das schmale Import-Format. Komma- oder Semikolon-getrennt, englische oder deutsche Köpfe.

| Spalte | Pflicht | Aliasse |
| --- | --- | --- |
| Date | ja | Datum |
| Hours | ja | Stunden, Hours Rounded |
| Client | nein | Kunde |
| Project | nein | Projekt |
| Task | nein | Aufgabe |
| Notes | nein | Notizen, Bemerkungen |
| Billable Rate | nein | Stundensatz, Abrechenbarer Satz |
| Billable Amount | nein | Betrag — falls Satz fehlt: Betrag ÷ Stunden |
| Billable? | nein | Abrechenbar? — *No/Nein* wird abgewählt |

Daten: `YYYY-MM-DD`, `DD.MM.YYYY`, `M/D/YYYY`. Stunden: `6.5` oder `6,5`.

## MwSt

Pro Zeile: **8.1%** Normalsatz, **2.6%** reduziert, **0%** befreit. Netto = Stunden × Ansatz, MwSt auf Netto, kaufmännisch auf **5 Rappen**.

## QR-Rechnung

Erzeugt mit [`swissqrbill`](https://www.npmjs.com/package/swissqrbill) + PDFKit.

- Sprache **DE** (Rechnung, Betrag, MwSt, Zahlbar bis, Empfangsschein, Zahlteil)
- QR-IBAN → Referenz **QRR** (27 Stellen)
- normale IBAN → **SCOR** (`RF…`)
- Leere oder SIX-Beispiel-IBAN `CH44 3199 9123 0008 8901 2` → deutlicher **Musterdaten**-Hinweis auf PDF und UI

Vor dem Versand an Kunden: IBAN unter *Einstellungen* ersetzen und das PDF mit einem [QR-Bill-Validator](https://swiss-qr-invoice.org/validator/?lang=de) prüfen.

## Beta-Zugang

Kein Magic-Link-Mailer, kein Polar-Entitlement. `BETA_ACCESS` (Default `flatqr-beta`) plus E-Mail setzt ein Session-Cookie. Polar Agency Flat / Solo bleibt Stub.

Marketing-Seite (kein App-Login): [https://flatqr-ch.surge.sh](https://flatqr-ch.surge.sh).

## Deploy (Budget 0)

Kernpfad braucht keine bezahlten APIs. Speicher ist lokal SQLite.

**Render Free** (`render.yaml`): Web Service, Plan *Free*, Frankfurt. Set `BETA_ACCESS=flatqr-beta`.  
Free instances **cannot** attach a persistent disk — SQLite in `data/` is wiped when the service sleeps (15 min idle) or redeploys. Demo-CSV → QR-PDF still works after each cold start. For durable drafts, point `DATABASE_URL` + `TURSO_AUTH_TOKEN` at a free Turso DB.

**Fly.io:** `Dockerfile` is ready, but new Fly orgs only get a short unpaid trial (then a card). Do not use Fly if the rule is zero spend.

```bash
npm run build
PORT=43127 npm start
```

## Tests

```bash
npm test
```

Deckt CSV-Mapping (EN/DE, Semikolon) und MwSt/5-Rappen-Rechnung ab. Ein Test erzeugt ein echtes QR-PDF aus der Demo-CSV.

## Was v1 nicht ist

- Kein Harvest-API-Sync (nur CSV)
- Kein ZUGFeRD / XRechnung
- Keine ESTV-/bexio-Exporte, keine Buchhaltung
- Kein Multi-Tenant, keine Polar-Prüfung
- Keine Steuerberatung — Sätze und Rundung sind Werkzeug, nicht Bescheid

## Impressum

Joel Baumann  
In den Klosterreben 48  
4052 Basel  
shopnordcart@gmail.com
