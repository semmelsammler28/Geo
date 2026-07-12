#!/usr/bin/env node
// Validiert data/countries.json gegen schema/country.schema.json (ajv) und
// führt zusätzliche Plausibilitäts-/Integritätschecks aus, die ein reines
// JSON-Schema nicht abdecken kann (Referenzen, Dichte-Ausreißer, Quiz-Eindeutigkeit).
//
// Ziel laut GEO_APP_BRIEFING.md Abschnitt 3: "Skript zur Validierung gegen
// Tippfehler/Ausreißer". Exit-Code 1 bei Fehlern, 0 bei nur Warnungen.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Ab dieser Datensatzgröße erwarten wir Vollständigkeit: unbekannte
// Nachbar-Referenzen werden dann zu Fehlern statt Warnungen.
const COMPLETE_THRESHOLD = 190;
const EXPECTED_COUNT = 197; // 195 UN + Taiwan + Kosovo (Entscheidung 2.1 + Kosovo)
// Höchste reale Bevölkerungsdichte eines Landes (Monaco ~19.000/km²).
// Darüber ist mit hoher Wahrscheinlichkeit ein Zahlendreher im Spiel.
const MAX_PLAUSIBLE_DENSITY = 30000;

const errors = [];
const warnings = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const warn = (id, msg) => warnings.push(`${id}: ${msg}`);

const schema = JSON.parse(readFileSync(resolve(root, "schema/country.schema.json"), "utf8"));

let countries;
try {
  countries = JSON.parse(readFileSync(resolve(root, "data/countries.json"), "utf8"));
} catch (e) {
  console.error(`Konnte data/countries.json nicht lesen: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(countries)) {
  console.error("data/countries.json muss ein Array von Ländern sein.");
  process.exit(1);
}

// --- 1. Schema-Validierung ---------------------------------------------------
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

for (const c of countries) {
  const id = c?.id ?? "<ohne id>";
  if (!validate(c)) {
    for (const e of validate.errors) {
      err(id, `Schema ${e.instancePath || "/"} ${e.message}`);
    }
  }
}

// --- 2. Plausibilitäts- und Integritätschecks -------------------------------
const ids = new Set();
const complete = countries.length >= COMPLETE_THRESHOLD;

for (const c of countries) {
  const id = c?.id ?? "<ohne id>";

  // Eindeutige IDs
  if (ids.has(id)) err(id, "doppelte id");
  ids.add(id);

  // Genau eine Quiz-Hauptstadt (Quiz-Eindeutigkeit, Entscheidung 2.1)
  const caps = Array.isArray(c.capitals) ? c.capitals : [];
  if (caps.length > 0) {
    const primaries = caps.filter((k) => k.isPrimaryForQuiz).length;
    if (primaries !== 1) {
      err(id, `genau eine Hauptstadt muss isPrimaryForQuiz=true sein, gefunden: ${primaries}`);
    }
  }

  const geo = c.geography ?? {};

  // Binnenstaat ohne Nachbarn ist unmöglich
  if (geo.landlocked === true && Array.isArray(geo.neighbors) && geo.neighbors.length === 0) {
    err(id, "landlocked=true, aber keine Nachbarländer angegeben");
  }

  // Nachbar-Referenzen müssen existierende IDs sein
  for (const n of geo.neighbors ?? []) {
    if (!countries.some((x) => x.id === n)) {
      const msg = `Nachbar '${n}' ist kein bekanntes Land`;
      complete ? err(id, msg) : warn(id, msg);
    }
    if (n === id) err(id, "Land ist als eigener Nachbar gelistet");
  }

  // Bevölkerungsdichte-Ausreißer (Tippfehler-Fang)
  const pop = c.society?.population?.value;
  const area = geo.area?.value;
  if (typeof pop === "number" && typeof area === "number" && area > 0) {
    const density = pop / area;
    if (density > MAX_PLAUSIBLE_DENSITY) {
      warn(id, `Bevölkerungsdichte ${density.toFixed(0)}/km² über Plausibilitätsgrenze ${MAX_PLAUSIBLE_DENSITY} (Zahlendreher?)`);
    }
    if (density < 0.1 && pop > 0) {
      warn(id, `Bevölkerungsdichte ${density.toFixed(3)}/km² unplausibel niedrig`);
    }
  }

  // HDI im Wertebereich 0..1
  const hdi = c.economy?.hdi?.value;
  if (typeof hdi === "number" && (hdi < 0 || hdi > 1)) {
    err(id, `HDI ${hdi} außerhalb 0..1`);
  }

  // Kernstats-Vollständigkeit (Tier-2-Lücken). Bewusst nur Warnung, nicht
  // Fehler: fehlende Bevölkerung/Zeitzonen sind offline erwartbar und werden
  // später per `npm run refresh` ergänzt.
  if (c.society?.population?.value == null) warn(id, "keine Bevölkerung (Tier-2-Lücke)");
  if (!(geo.timezones?.length > 0)) warn(id, "keine Zeitzonen (Tier-2-Lücke)");
}

// --- 3. Datensatz-weite Checks ----------------------------------------------
if (countries.length !== EXPECTED_COUNT) {
  warn("_dataset", `${countries.length} Länder statt erwarteter ${EXPECTED_COUNT} (195 UN + Taiwan). Bei Seed-Datensatz normal.`);
}

// --- Report ------------------------------------------------------------------
for (const w of warnings) console.warn(`⚠️  ${w}`);
for (const e of errors) console.error(`❌ ${e}`);

console.log(
  `\n${countries.length} Länder geprüft · ${errors.length} Fehler · ${warnings.length} Warnungen`
);
process.exit(errors.length > 0 ? 1 : 0);
