#!/usr/bin/env node
// Einmalige Ingestion aus der REST Countries API (v3.1) in unser Datenmodell
// (schema/country.schema.json). Schreibt data/countries.json und einen
// Lückenreport data/_factbook-gaps.json (Worklist für CIA-World-Factbook-
// bzw. Handnachpflege der Felder, die REST Countries nicht liefert).
//
// WICHTIG: braucht Netzzugang zu restcountries.com. In abgeschotteten
// Umgebungen (z. B. dieser mit strikter Proxy-Policy) schlägt der Fetch mit
// 403 fehl — dann lokal oder in einer Umgebung mit gelockerter Policy laufen
// lassen: `npm run fetch`. Danach `npm run validate`.
//
// Bewusste Entscheidung: REST Countries ist die Basis (Geografie, Codes,
// Praktisches, Kern-Stats). Felder ohne Quelle in REST (BIP, HDI, Regierungs-
// chef, Religionen, Wahrzeichen, UNESCO, Klima, höchster Punkt …) bleiben leer
// und landen im Lückenreport — sie werden separat aus dem Factbook ergänzt.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Datenstand (globaler dataSnapshot, Entscheidung 2.1). REST Countries führt
// keinen einheitlichen Stichtag; das Erhebungsjahr hier zentral pflegen.
const DATA_SNAPSHOT = 2024;

// REST Countries kennt keinen Beobachter-/Nichtmitglied-Status. Entscheidung
// 2.1: 195 UN (193 Mitglieder + 2 Beobachter) + Taiwan = 196. Alles mit
// unMember=true ist 'member'; hier die Ausnahmen kuratiert überschreiben.
const UN_MEMBERSHIP_OVERRIDE = {
  VAT: { unMembership: "observer", sovereigntyNote: "UN-Beobachterstaat (Heiliger Stuhl)." },
  PSE: { unMembership: "observer", sovereigntyNote: "UN-Beobachterstaat; Anerkennung als Staat international uneinheitlich." },
  TWN: { unMembership: "non-member", sovereigntyNote: "De-facto souverän, kein UN-Mitglied; von der VR China beansprucht." },
  XKX: { unMembership: "non-member", sovereigntyNote: "Von rund 100 UN-Staaten anerkannt; Serbien und weitere erkennen nicht an." },
};

// REST Countries liefert Hauptstädte nur als String-Array ohne Typ/Primär-
// Markierung. Entscheidung 2.1: Regierungssitz ist die Quiz-Antwort. Multi-
// Hauptstadt-Fälle hier kuratiert setzen; alle übrigen erhalten den Default
// (erste Hauptstadt = administrativ + isPrimaryForQuiz).
const CAPITALS_OVERRIDE = {
  ZAF: [
    { name: "Pretoria", type: "administrative", isPrimaryForQuiz: true },
    { name: "Kapstadt", type: "legislative", isPrimaryForQuiz: false },
    { name: "Bloemfontein", type: "judicial", isPrimaryForQuiz: false },
  ],
  BOL: [
    { name: "La Paz", type: "administrative", isPrimaryForQuiz: true },
    { name: "Sucre", type: "constitutional", isPrimaryForQuiz: false },
  ],
  NLD: [
    // Laura-Entscheidung: Amsterdam (verfassungsmäßige Hauptstadt, konventionelle
    // Quiz-Antwort) ist die Quiz-Hauptstadt; Den Haag als Regierungssitz nur im
    // Steckbrief.
    { name: "Amsterdam", type: "constitutional", isPrimaryForQuiz: true },
    { name: "Den Haag", type: "administrative", isPrimaryForQuiz: false },
  ],
};

// Strittige Hauptstadt-Fälle (Entscheidung 2.1): Flag am Hauptstadt-Eintrag.
const CAPITAL_DISPUTE = {
  ISR: { note: "Jerusalem wird von Israel als Hauptstadt geführt; völkerrechtlich umstritten, die meisten Staaten unterhalten Botschaften in Tel Aviv." },
};

const FIELDS = [
  "name", "cca2", "cca3", "ccn3", "capital", "region", "subregion", "continents",
  "population", "area", "borders", "latlng", "capitalInfo", "landlocked",
  "unMember", "independent", "timezones", "currencies", "languages",
  "translations", "car", "idd", "tld", "flags", "flag",
].join(",");

// REST region -> unser continent-Enum. Bei transkontinentalen Ländern ist
// continents[0] aus der API führend; region dient als Fallback.
const REGION_TO_CONTINENT = {
  Africa: "Africa", Americas: null, Asia: "Asia", Europe: "Europe",
  Oceania: "Oceania", Antarctic: "Antarctica",
};

function toContinent(rc) {
  if (Array.isArray(rc.continents) && rc.continents.length) return rc.continents[0];
  return REGION_TO_CONTINENT[rc.region] ?? rc.region;
}

function callingCode(idd) {
  if (!idd?.root) return undefined;
  const suffix = idd.suffixes?.length === 1 ? idd.suffixes[0] : "";
  return `${idd.root}${suffix}`;
}

function capitalsFor(rc) {
  const id = rc.cca3;
  if (CAPITALS_OVERRIDE[id]) return CAPITALS_OVERRIDE[id];
  const list = rc.capital ?? [];
  return list.map((name, i) => {
    const cap = { name, type: "administrative", isPrimaryForQuiz: i === 0 };
    if (i === 0 && CAPITAL_DISPUTE[id]) {
      cap.disputed = true;
      cap.disputeNote = CAPITAL_DISPUTE[id].note;
    }
    return cap;
  });
}

function statusFor(rc) {
  const id = rc.cca3;
  if (UN_MEMBERSHIP_OVERRIDE[id]) return { ...UN_MEMBERSHIP_OVERRIDE[id] };
  return { unMembership: rc.unMember ? "member" : "non-member" };
}

function mapCountry(rc) {
  const [lat, lng] = rc.latlng ?? [undefined, undefined];
  const country = {
    id: rc.cca3,
    names: {
      common: rc.name?.common,
      official: rc.name?.official,
      de: rc.translations?.deu?.common,
    },
    codes: { cca2: rc.cca2, cca3: rc.cca3, ccn3: rc.ccn3 },
    flag: { emoji: rc.flag, svgUrl: rc.flags?.svg },
    status: statusFor(rc),
    capitals: capitalsFor(rc),
    geography: {
      continent: toContinent(rc),
      subregion: rc.subregion ?? "",
      coordinates: { lat, lng },
      neighbors: rc.borders ?? [],
      landlocked: Boolean(rc.landlocked),
      timezones: rc.timezones ?? [],
      area: typeof rc.area === "number" ? { value: rc.area } : undefined,
    },
    economy: {
      currencies: Object.entries(rc.currencies ?? {}).map(([code, v]) => ({
        code, name: v?.name, symbol: v?.symbol,
      })),
    },
    society: {
      officialLanguages: Object.values(rc.languages ?? {}),
      population: typeof rc.population === "number" ? { value: rc.population } : undefined,
    },
    practical: {
      callingCode: callingCode(rc.idd),
      carSigns: rc.car?.signs?.filter(Boolean),
      drivingSide: rc.car?.side,
      internetTld: rc.tld,
    },
    dataSnapshot: DATA_SNAPSHOT,
    sources: ["REST Countries v3.1"],
  };
  return country;
}

// Felder, die REST Countries nicht liefert und die aus dem Factbook/Hand
// ergänzt werden müssen (Basis für den Lückenreport).
const FACTBOOK_FIELDS = [
  "geography.highestPoint", "geography.largestWaterBody", "geography.climateZones",
  "politics.governmentForm", "politics.headOfState", "politics.headOfGovernment",
  "politics.alliances", "economy.gdpUsd", "economy.gdpPerCapitaUsd", "economy.hdi",
  "society.mainReligions", "society.lifeExpectancyYears", "practical.plugTypes",
  "culture.landmarks", "culture.unescoSites", "culture.nationalDish",
  "culture.nationalDay", "funFacts",
];

async function main() {
  const url = `https://restcountries.com/v3.1/all?fields=${FIELDS}`;
  process.stdout.write(`Lade ${url} …\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`REST Countries antwortete ${res.status} ${res.statusText}`);
  const raw = await res.json();

  const countries = raw
    .map(mapCountry)
    .sort((a, b) => a.id.localeCompare(b.id));

  // Lückenreport: pro Land die Factbook-Felder, die noch fehlen.
  const gaps = countries.map((c) => ({
    id: c.id,
    name: c.names.common,
    missing: FACTBOOK_FIELDS,
  }));

  mkdirSync(resolve(root, "data"), { recursive: true });
  writeFileSync(resolve(root, "data/countries.json"), JSON.stringify(countries, null, 2) + "\n");
  writeFileSync(resolve(root, "data/_factbook-gaps.json"), JSON.stringify(gaps, null, 2) + "\n");

  console.log(`\n${countries.length} Länder geschrieben nach data/countries.json`);
  console.log(`Lückenreport: data/_factbook-gaps.json (${FACTBOOK_FIELDS.length} Factbook-Felder/Land offen)`);
  console.log("Nächster Schritt: npm run validate");
}

main().catch((e) => {
  console.error(`\nFetch fehlgeschlagen: ${e.message}`);
  console.error("Falls 403/Proxy-Fehler: restcountries.com ist in dieser Umgebung nicht erreichbar. Lokal ausführen.");
  process.exit(1);
});
