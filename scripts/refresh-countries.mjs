#!/usr/bin/env node
// Optionaler Auffrisch-Schritt: legt frische Tier-2-Zahlen aus der REST
// Countries API (v3.1) als Overlay auf das bestehende data/countries.json.
// Überschrieben werden nur veränderliche Live-Werte:
//   - society.population  (mit aktuellem asOf)
//   - geography.timezones
//   - practical.drivingSide + practical.carSigns
// Struktur, Namen, Hauptstädte-Kuratierung, Status und Streitstände aus dem
// Offline-Build (npm run build) bleiben unangetastet.
//
// WICHTIG: braucht Netzzugang zu restcountries.com. In abgeschotteten
// Umgebungen (Proxy-Policy) schlägt der Aufruf mit 403 fehl — dann lokal
// ausführen: `npm run refresh` und danach `npm run validate`.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dataPath = resolve(root, "data/countries.json");

const YEAR = new Date().getFullYear();

// REST Countries führt Kosovo unter cca3 "UNK"; wir unter "XKX".
const API_CODE = { XKX: "UNK" };

const FIELDS = ["cca3", "population", "timezones", "car"].join(",");

async function main() {
  const countries = JSON.parse(readFileSync(dataPath, "utf8"));

  const url = `https://restcountries.com/v3.1/all?fields=${FIELDS}`;
  process.stdout.write(`Lade ${url} …\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`REST Countries antwortete ${res.status} ${res.statusText}`);
  const raw = await res.json();
  const byCode = new Map(raw.map((r) => [r.cca3, r]));

  let updated = 0;
  const missed = [];
  for (const c of countries) {
    const api = byCode.get(c.id) ?? byCode.get(API_CODE[c.id]);
    if (!api) { missed.push(c.id); continue; }

    if (typeof api.population === "number" && api.population > 0) {
      c.society.population = { value: api.population, asOf: YEAR };
    }
    if (Array.isArray(api.timezones) && api.timezones.length) {
      c.geography.timezones = api.timezones;
    }
    if (api.car?.side) c.practical.drivingSide = api.car.side;
    if (Array.isArray(api.car?.signs) && api.car.signs.filter(Boolean).length) {
      c.practical.carSigns = api.car.signs.filter(Boolean);
    }
    if (!c.sources.some((s) => s.startsWith("REST Countries"))) {
      c.sources.push(`REST Countries v3.1 (refresh ${YEAR})`);
    }
    c.dataSnapshot = YEAR;
    updated++;
  }

  writeFileSync(dataPath, JSON.stringify(countries, null, 2) + "\n");
  console.log(`\n${updated}/${countries.length} Länder aufgefrischt.`);
  if (missed.length) console.log(`Ohne API-Treffer: ${missed.join(", ")}`);
  console.log("Nächster Schritt: npm run validate");
}

main().catch((e) => {
  console.error(`\nRefresh fehlgeschlagen: ${e.message}`);
  console.error("Falls 403/Proxy-Fehler: restcountries.com ist in dieser Umgebung nicht erreichbar. Lokal ausführen.");
  process.exit(1);
});
