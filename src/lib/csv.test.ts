import { describe, expect, it } from "vitest";
import { parseHarvestCsv } from "./csv";

const DETAILED = `Date,Client,Project,Project Code,Task,Notes,Hours,Billable?,First Name,Last Name,Billable Rate,Billable Amount,Currency
2026-08-04,Atelier Nord GmbH,Website Relaunch,AN-WEB,Development,CSV-Import,6.50,Yes,Joel,Baumann,160.00,1040.00,CHF
2026-08-20,Atelier Nord GmbH,Interne Ablage,AN-OPS,Admin,Dateiordnung,1.00,No,Joel,Baumann,0.00,0.00,CHF
`;

const GERMAN_SEMI = `Datum;Kunde;Projekt;Aufgabe;Notizen;Stunden;Abrechenbar?;Stundensatz
04.08.2026;Atelier Nord GmbH;Website Relaunch;Development;CSV-Import;6,5;Ja;160
20.08.2026;Atelier Nord GmbH;Interne Ablage;Admin;Dateiordnung;1;Nein;0
`;

const US_DATE = `Date,Client,Project,Task,Hours,Billable Rate
8/4/2026,Studio Lot,Brand,Workshop,2,200
`;

describe("parseHarvestCsv", () => {
  it("reads a Harvest detailed export", () => {
    const result = parseHarvestCsv(DETAILED);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].client).toBe("Atelier Nord GmbH");
    expect(result.entries[0].hours).toBe(6.5);
    expect(result.entries[0].billableRate).toBe(160);
    expect(result.entries[0].selected).toBe(true);
    expect(result.entries[1].selected).toBe(false);
    expect(result.format).toMatch(/Harvest/);
  });

  it("reads German headers, semicolons and comma decimals", () => {
    const result = parseHarvestCsv(GERMAN_SEMI);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].date).toBe("2026-08-04");
    expect(result.entries[0].hours).toBe(6.5);
    expect(result.entries[0].billableRate).toBe(160);
    expect(result.entries[0].project).toBe("Website Relaunch");
  });

  it("accepts US-style dates and derives rate from amount when needed", () => {
    const result = parseHarvestCsv(US_DATE);
    expect(result.entries[0].date).toBe("2026-08-04");
    expect(result.entries[0].billableRate).toBe(200);
  });

  it("throws when hours column is missing", () => {
    expect(() => parseHarvestCsv("Date,Client\n2026-08-01,X\n")).toThrow(/Stunden/);
  });
});
