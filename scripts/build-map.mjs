#!/usr/bin/env node
// Baut aus Natural-Earth-Geometrien (npm world-atlas, TopoJSON) fertige SVG-
// Pfade für die Weltkarte und schreibt sie nach src/data/world-map.json.
// Bewusst zur Bauzeit projiziert: der Client rendert nur <path>-Strings, kein
// d3/topojson zur Laufzeit (schlank, offline, wie die übrige Datenpipeline).
//
// ID-Mapping: world-atlas nutzt numerisches ISO-3166 (= ccn3). Wir mappen es
// auf unsere cca3-IDs über data/countries.json, damit Klick -> Steckbrief und
// Choropleth-Einfärbung funktionieren. Nicht gematchte Flächen bleiben neutral.
//
// Ausführen: npm run data:map

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { feature } from "topojson-client";
import { geoNaturalEarth1, geoPath } from "d3-geo";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const WIDTH = 960;
const HEIGHT = 500;
const PAD = 6;

const atlas = JSON.parse(readFileSync(resolve(root, "node_modules/world-atlas/countries-110m.json"), "utf8"));
const fc = feature(atlas, atlas.objects.countries);

const projection = geoNaturalEarth1().fitExtent([[PAD, PAD], [WIDTH - PAD, HEIGHT - PAD]], fc);
const path = geoPath(projection);

// ccn3 (als Zahl) -> cca3 + Anzeigename aus unseren Daten
const countries = JSON.parse(readFileSync(resolve(root, "data/countries.json"), "utf8"));
const ccn3ToCountry = new Map();
for (const c of countries) {
  if (c.codes?.ccn3 != null) ccn3ToCountry.set(Number(c.codes.ccn3), c);
}

// Koordinaten auf 1 Nachkommastelle runden — bei 960px optisch verlustfrei, ~halbe Dateigröße.
const round1 = (d) => d.replace(/-?\d+\.\d+/g, (m) => (Math.round(Number(m) * 10) / 10).toString());

let matched = 0;
const shapes = fc.features
  .map((f) => {
    const d = path(f);
    if (!d) return null;
    const match = /^[0-9]+$/.test(String(f.id)) ? ccn3ToCountry.get(Number(f.id)) : undefined;
    if (match) matched++;
    return {
      cca3: match?.id ?? null,
      name: match ? (match.names.de ?? match.names.common) : f.properties?.name ?? "?",
      d: round1(d),
    };
  })
  .filter(Boolean);

mkdirSync(resolve(root, "src/data"), { recursive: true });
const out = { width: WIDTH, height: HEIGHT, shapes };
writeFileSync(resolve(root, "src/data/world-map.json"), JSON.stringify(out) + "\n");

console.log(`${shapes.length} Flächen projiziert, davon ${matched} mit cca3 verknüpft.`);
console.log("Geschrieben: src/data/world-map.json");
