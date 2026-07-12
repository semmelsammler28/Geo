import type { Country } from "../types/country";

// Ähnlichkeitsbasis für die Distraktor-Auswahl (Briefing 4.1). Kernfehler in v1:
// Antwortoptionen zu beliebig -> per Ausschluss erratbar. Hier ziehen wir
// Distraktoren gezielt aus "verwechselbaren" Mengen statt zufällig.

/** Zufalls-Generator, injizierbar für deterministische Tests. */
export type Rng = () => number;

export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** n zufällige, verschiedene Elemente aus pool (ohne die in exclude enthaltenen). */
export function pickN<T>(pool: readonly T[], n: number, rng: Rng, exclude: Set<T> = new Set()): T[] {
  const candidates = shuffle(pool.filter((x) => !exclude.has(x)), rng);
  return candidates.slice(0, n);
}

// --- Flaggen-Cluster: Gruppen visuell ähnlicher Flaggen (Farbschema + Layout).
// Hard Mode zieht Distraktoren bevorzugt aus demselben Cluster.
export const FLAG_CLUSTERS: { name: string; ids: string[] }[] = [
  { name: "Nordische Kreuze", ids: ["DNK", "SWE", "NOR", "ISL", "FIN"] },
  { name: "Panarabische Trikolore", ids: ["EGY", "SYR", "IRQ", "YEM", "SDN", "JOR", "PSE", "KWT", "ARE"] },
  { name: "Westafrika grün-gelb-rot (vertikal)", ids: ["MLI", "SEN", "GIN", "CMR"] },
  { name: "Panafrika rot-gelb-grün (horizontal)", ids: ["GHA", "ETH", "BEN", "TGO", "GNB"] },
  { name: "Panslawisch weiß-blau-rot", ids: ["RUS", "SRB", "SVK", "SVN", "HRV"] },
  { name: "Niederlande/Luxemburg", ids: ["NLD", "LUX"] },
  { name: "Vertikale Trikolore grün/weiß/orange", ids: ["IRL", "CIV", "ITA", "NER", "IND"] },
  { name: "Rot-weiße Bänder", ids: ["IDN", "MCO", "POL", "SGP", "AUT", "LVA"] },
  { name: "Stern & Halbmond", ids: ["TUR", "TUN", "DZA", "PAK", "MRT", "AZE", "TKM", "LBY"] },
  { name: "Southern Cross / Union Jack", ids: ["AUS", "NZL", "FJI", "TUV", "PNG", "WSM"] },
  { name: "Mittelamerika blau-weiß-blau", ids: ["ARG", "GTM", "HND", "NIC", "SLV"] },
  { name: "Rot-weiß-grün", ids: ["HUN", "BGR", "TJK", "IRN"] },
  { name: "Blau-gelb-rot (vertikal)", ids: ["TCD", "ROU", "MDA", "AND"] },
  { name: "Gelb-blau-rot (horizontal)", ids: ["COL", "ECU", "VEN"] },
  { name: "Gezackt rot-weiß", ids: ["BHR", "QAT"] },
  { name: "Stars & Stripes (Streifen)", ids: ["USA", "LBR", "MYS"] },
];

const idToCluster = new Map<string, string[]>();
for (const cl of FLAG_CLUSTERS) {
  for (const id of cl.ids) idToCluster.set(id, cl.ids);
}

/** Ids visuell ähnlicher Flaggen zum gegebenen Land (ohne es selbst). */
export function flagClusterIds(id: string): string[] {
  return (idToCluster.get(id) ?? []).filter((x) => x !== id);
}

/** Länder mit gleicher Subregion (Fallback: gleicher Kontinent), ohne das Land selbst. */
export function sameRegionPool(country: Country, all: Country[]): Country[] {
  const sub = all.filter(
    (c) => c.id !== country.id && c.geography.subregion === country.geography.subregion
  );
  if (sub.length >= 3) return sub;
  return all.filter(
    (c) => c.id !== country.id && c.geography.continent === country.geography.continent
  );
}

/**
 * Länder, deren Metrik-Wert in ähnlicher Größenordnung zum Referenzwert liegt
 * (Faktor [1/factor, factor], Briefing: 0,5–2×).
 */
export function magnitudePool(
  refValue: number,
  all: Country[],
  get: (c: Country) => number | undefined,
  excludeId: string,
  factor = 2
): Country[] {
  const lo = refValue / factor;
  const hi = refValue * factor;
  return all.filter((c) => {
    if (c.id === excludeId) return false;
    const v = get(c);
    return v != null && v >= lo && v <= hi;
  });
}

// Transkontinentale Grenzfälle: im Kontinent-Quiz bewusst als schwere Fragen
// einbauen (Briefing 4.1) statt vermeiden.
export const TRANSCONTINENTAL = ["RUS", "TUR", "KAZ", "EGY", "AZE", "GEO", "CYP", "ARM"];
