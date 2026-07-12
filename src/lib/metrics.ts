import type { Country } from "../types/country";
import { area, num, usd } from "./format";

// Gemeinsame Metrik-Definitionen für Vergleich und Rankings. get() liefert
// undefined, wenn das Land die Metrik (noch) nicht hat (Tier-2-Lücke).
export interface Metric {
  key: string;
  label: string;
  get: (c: Country) => number | undefined;
  format: (v: number) => string;
  /** Standard-Sortierrichtung im Ranking. */
  direction: "desc" | "asc";
}

const density = (c: Country): number | undefined => {
  const pop = c.society.population?.value;
  const a = c.geography.area?.value;
  return pop != null && a ? pop / a : undefined;
};

export const METRICS: Metric[] = [
  {
    key: "population",
    label: "Bevölkerung",
    get: (c) => c.society.population?.value,
    format: num,
    direction: "desc",
  },
  {
    key: "area",
    label: "Fläche",
    get: (c) => c.geography.area?.value,
    format: area,
    direction: "desc",
  },
  {
    key: "density",
    label: "Bevölkerungsdichte",
    get: density,
    format: (v) => `${num(Math.round(v))} /km²`,
    direction: "desc",
  },
  {
    key: "lifeExpectancy",
    label: "Lebenserwartung",
    get: (c) => c.society.lifeExpectancyYears?.value,
    format: (v) => `${v.toFixed(1)} Jahre`,
    direction: "desc",
  },
  {
    key: "gdp",
    label: "BIP",
    get: (c) => c.economy.gdpUsd?.value,
    format: usd,
    direction: "desc",
  },
  {
    key: "gdpPerCapita",
    label: "BIP pro Kopf",
    get: (c) => c.economy.gdpPerCapitaUsd?.value,
    format: usd,
    direction: "desc",
  },
  {
    key: "hdi",
    label: "HDI",
    get: (c) => c.economy.hdi?.value,
    format: (v) => v.toFixed(3),
    direction: "desc",
  },
];

export const metricByKey = new Map(METRICS.map((m) => [m.key, m]));

/** Anzahl Länder, für die die Metrik einen Wert liefert. */
export function coverage(metric: Metric, list: Country[]): number {
  return list.reduce((n, c) => (metric.get(c) != null ? n + 1 : n), 0);
}
