import type { Country } from "../types/country";
import raw from "../../data/countries.json";

// data/countries.json ist die eingefrorene Quelle (via npm run build erzeugt).
export const countries = raw as unknown as Country[];

const byId = new Map(countries.map((c) => [c.id, c]));

export function getCountry(id: string): Country | undefined {
  return byId.get(id);
}

/** Anzeigename: deutscher Name falls vorhanden, sonst der gebräuchliche. */
export function displayName(c: Country): string {
  return c.names.de ?? c.names.common;
}

/** cca3-ID -> Anzeigename; fällt auf die ID zurück, falls unbekannt. */
export function nameForId(id: string): string {
  const c = byId.get(id);
  return c ? displayName(c) : id;
}
