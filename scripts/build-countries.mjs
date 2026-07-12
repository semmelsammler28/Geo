#!/usr/bin/env node
// Offline-Generator für data/countries.json aus npm-Datensätzen (kein Netz nötig).
// Quellen (siehe docs/DATEN-PIPELINE.md):
//   - world-countries : Struktur/Geo (Namen inkl. deutsch, ISO-Codes, Hauptstädte,
//     Nachbarn, Koordinaten, Fläche, Währungen, Sprachen, Binnenstaat, Flag). Aktuell.
//   - country-json    : Bevölkerung + Lebenserwartung. Statischer Stand ~2016
//                       (asOf entsprechend gesetzt), später per fetch auffrischbar.
//   - kuratierte Overrides in diesem Skript: Status (Beobachter/Nichtmitglied),
//     Mehrfach-Hauptstädte, Streitstände, Sonderfall-Bevölkerungen.
//
// Zielmenge (Entscheidung 2.1 + Kosovo): 193 UN-Mitglieder + 2 Beobachter
// (Vatikan, Palästina) + Taiwan + Kosovo = 197 Records.
//
// Ausführen: npm run build   danach: npm run validate

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import world from "world-countries";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const cj = (file) =>
  JSON.parse(readFileSync(resolve(root, "node_modules/country-json/src", file), "utf8"));

const DATA_SNAPSHOT = 2024; // Struktur/Geo-Stand
const OFFLINE_STATS_YEAR = 2016; // ungefährer Stand der country-json-Zahlen

// world-countries nutzt für Kosovo den Code UNK; wir führen ihn als XKX.
const ID_REMAP = { UNK: "XKX" };
const remapId = (c) => ID_REMAP[c] ?? c;

// Sonderfälle, die kein UN-Mitglied sind, aber zur Zielmenge gehören.
const SPECIAL = new Set(["VAT", "PSE", "TWN", "UNK"]);

// UN-Status (Entscheidung 2.1). Alles mit unMember=true -> member; hier die Ausnahmen.
// Keyed nach UNSERER id (XKX für Kosovo).
const STATUS_OVERRIDE = {
  VAT: { unMembership: "observer", sovereigntyNote: "UN-Beobachterstaat (Heiliger Stuhl)." },
  PSE: { unMembership: "observer", sovereigntyNote: "UN-Beobachterstaat; staatliche Anerkennung international uneinheitlich." },
  TWN: { unMembership: "non-member", sovereigntyNote: "De-facto souverän, kein UN-Mitglied; von der VR China beansprucht." },
  XKX: { unMembership: "non-member", sovereigntyNote: "Von rund 100 UN-Staaten anerkannt; Serbien und weitere erkennen nicht an." },
};

// Mehrfach-Hauptstädte (Entscheidung 2.1: Regierungssitz = Quiz-Antwort).
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
    // Laura-Entscheidung: Amsterdam ist die Quiz-Hauptstadt, Den Haag nur Steckbrief.
    { name: "Amsterdam", type: "constitutional", isPrimaryForQuiz: true },
    { name: "Den Haag", type: "administrative", isPrimaryForQuiz: false },
  ],
};

// Strittige Hauptstadt (Flag am Eintrag, Entscheidung 2.1).
const CAPITAL_DISPUTE = {
  ISR: "Jerusalem wird von Israel als Hauptstadt geführt; völkerrechtlich umstritten, die meisten Staaten unterhalten Botschaften in Tel Aviv.",
};

// Länderübergreifende Streitstände (Quiz-Engine behandelt betroffene Felder als Info).
const DISPUTES = {
  TWN: [{ field: "status.sovereignty", note: "Der völkerrechtliche Status Taiwans ist umstritten; die VR China beansprucht die Insel." }],
  XKX: [{ field: "status.sovereignty", note: "Die Unabhängigkeit Kosovos wird nicht von allen Staaten anerkannt (u. a. Serbien)." }],
  ISR: [{ field: "capitals", note: "Der Hauptstadtstatus Jerusalems ist völkerrechtlich umstritten." }],
};

// Bevölkerung für Fälle, die country-json nicht führt (Sonderfälle).
const POPULATION_OVERRIDE = {
  TWN: { value: 23923276, asOf: 2024 },
  XKX: { value: 1802020, asOf: 2024 },
  VAT: { value: 764, asOf: 2024 },
};

// Namen, die zwischen world-countries und country-json nicht exakt matchen.
// Keyed nach UNSERER id -> country-json "country"-String.
const CJ_NAME_ALIAS = {
  COD: "The Democratic Republic of Congo",
  COG: "Congo",
  CZE: "Czech Republic",
  FJI: "Fiji Islands",
  FSM: "Micronesia, Federated States of",
  TLS: "East Timor",
  TUR: "Turkey",
  LBY: "Libyan Arab Jamahiriya",
  SWZ: "Swaziland",
};

const norm = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

function buildCjIndex(rows, valueKey) {
  const map = new Map();
  for (const r of rows) map.set(norm(r.country), r[valueKey]);
  return map;
}

const popIndex = buildCjIndex(cj("country-by-population.json"), "population");
const lifeIndex = buildCjIndex(cj("country-by-life-expectancy.json"), "expectancy");

function cjLookup(country, index) {
  const alias = CJ_NAME_ALIAS[country.id];
  if (alias && index.has(norm(alias))) return index.get(norm(alias));
  for (const key of [country.names.common, country.names.official]) {
    if (key && index.has(norm(key))) return index.get(norm(key));
  }
  return undefined;
}

// world-countries region/subregion -> unser continent-Enum.
function toContinent(rc) {
  switch (rc.region) {
    case "Africa": return "Africa";
    case "Europe": return "Europe";
    case "Asia": return "Asia";
    case "Oceania": return "Oceania";
    case "Antarctic": return "Antarctica";
    case "Americas":
      return rc.subregion === "South America" ? "South America" : "North America";
    default: return rc.region;
  }
}

function callingCode(idd) {
  if (!idd?.root) return undefined;
  const suffix = idd.suffixes?.length === 1 ? idd.suffixes[0] : "";
  return `${idd.root}${suffix}`;
}

function capitalsFor(id, rc) {
  if (CAPITALS_OVERRIDE[id]) return CAPITALS_OVERRIDE[id];
  const list = rc.capital ?? [];
  return list.map((name, i) => {
    const cap = { name, type: "administrative", isPrimaryForQuiz: i === 0 };
    if (i === 0 && CAPITAL_DISPUTE[id]) {
      cap.disputed = true;
      cap.disputeNote = CAPITAL_DISPUTE[id];
    }
    return cap;
  });
}

// --- Zielmenge filtern und IDs remappen -------------------------------------
const target = world.filter((c) => c.unMember === true || SPECIAL.has(c.cca3));
const targetIds = new Set(target.map((c) => remapId(c.cca3)));

const droppedNeighbors = new Set();

function neighborsFor(rc) {
  return (rc.borders ?? [])
    .map(remapId)
    .filter((n) => {
      if (targetIds.has(n)) return true;
      droppedNeighbors.add(n); // z. B. ESH/GIB/GUF/HKG/MAC (keine eigenen Länder)
      return false;
    });
}

function mapCountry(rc) {
  const id = remapId(rc.cca3);
  const [lat, lng] = rc.latlng ?? [undefined, undefined];

  const status = STATUS_OVERRIDE[id]
    ? { ...STATUS_OVERRIDE[id] }
    : { unMembership: "member" };

  const country = {
    id,
    names: {
      common: rc.name?.common,
      official: rc.name?.official,
      de: rc.translations?.deu?.common,
    },
    codes: { cca2: rc.cca2, cca3: id, ccn3: rc.ccn3 || undefined },
    flag: { emoji: rc.flag },
    status,
    capitals: capitalsFor(id, rc),
    geography: {
      continent: toContinent(rc),
      subregion: rc.subregion || "—",
      coordinates: { lat, lng },
      neighbors: neighborsFor(rc),
      landlocked: Boolean(rc.landlocked),
      area: typeof rc.area === "number" && rc.area >= 0 ? { value: rc.area } : undefined,
    },
    economy: {
      currencies: Object.entries(rc.currencies ?? {}).map(([code, v]) => ({
        code, name: v?.name, symbol: v?.symbol,
      })),
    },
    society: {
      officialLanguages: Object.values(rc.languages ?? {}),
    },
    practical: {
      callingCode: callingCode(rc.idd),
      internetTld: rc.tld,
    },
    dataSnapshot: DATA_SNAPSHOT,
    sources: ["world-countries"],
  };

  // Bevölkerung: Override > country-json (asOf 2016) > Lücke
  const popOverride = POPULATION_OVERRIDE[id];
  const popCj = cjLookup(country, popIndex);
  if (popOverride) {
    country.society.population = { ...popOverride };
  } else if (typeof popCj === "number" && popCj > 0) {
    country.society.population = { value: popCj, asOf: OFFLINE_STATS_YEAR };
    country.sources.push("country-json (Bevölkerung ~2016)");
  }

  // Lebenserwartung aus country-json
  const life = cjLookup(country, lifeIndex);
  if (typeof life === "number" && life > 0) {
    country.society.lifeExpectancyYears = { value: life, asOf: OFFLINE_STATS_YEAR };
    if (!country.sources.includes("country-json (Bevölkerung ~2016)")) {
      country.sources.push("country-json (Lebenserwartung ~2016)");
    }
  }

  if (DISPUTES[id]) country.disputes = DISPUTES[id];
  return country;
}

// --- Lückenreport (Tier-2/3-Felder, die offline fehlen) ---------------------
const EXPECTED_EVENTUALLY = [
  "geography.timezones", "geography.highestPoint", "geography.largestWaterBody", "geography.climateZones",
  "politics.governmentForm", "politics.headOfState", "politics.headOfGovernment", "politics.alliances",
  "economy.gdpUsd", "economy.gdpPerCapitaUsd", "economy.hdi",
  "society.population", "society.mainReligions", "society.lifeExpectancyYears",
  "practical.carSigns", "practical.drivingSide", "practical.plugTypes",
  "culture.landmarks", "culture.unescoSites", "culture.nationalDish", "culture.nationalDay",
  "funFacts",
];
const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

// --- Bauen -------------------------------------------------------------------
const countries = target.map(mapCountry).sort((a, b) => a.id.localeCompare(b.id));

const gaps = countries.map((c) => ({
  id: c.id,
  name: c.names.common,
  missing: EXPECTED_EVENTUALLY.filter((p) => getPath(c, p) == null),
}));

mkdirSync(resolve(root, "data"), { recursive: true });
writeFileSync(resolve(root, "data/countries.json"), JSON.stringify(countries, null, 2) + "\n");
writeFileSync(resolve(root, "data/_gaps.json"), JSON.stringify(gaps, null, 2) + "\n");

const withPop = countries.filter((c) => c.society.population).length;
console.log(`${countries.length} Länder gebaut -> data/countries.json`);
console.log(`Bevölkerung gesetzt: ${withPop}/${countries.length} · ohne: ${countries.filter((c) => !c.society.population).map((c) => c.id).join(", ") || "keine"}`);
console.log(`Übersprungene Nachbar-Refs (keine eigenen Länder): ${[...droppedNeighbors].sort().join(", ") || "keine"}`);
console.log(`Lückenreport: data/_gaps.json (Tier-2/3-Felder pro Land)`);
console.log("Nächster Schritt: npm run validate");
