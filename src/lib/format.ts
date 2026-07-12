const nf = new Intl.NumberFormat("de-DE");

export function num(n: number): string {
  return nf.format(n);
}

/** Fläche in km² mit Tausenderpunkten. */
export function area(km2: number): string {
  return `${nf.format(Math.round(km2 * 100) / 100)} km²`;
}

/** USD-Betrag kompakt (Mrd./Bio.). */
export function usd(value: number): string {
  if (value >= 1e12) return `${nf.format(Math.round(value / 1e11) / 10)} Bio. $`;
  if (value >= 1e9) return `${nf.format(Math.round(value / 1e8) / 10)} Mrd. $`;
  if (value >= 1e6) return `${nf.format(Math.round(value / 1e5) / 10)} Mio. $`;
  return `${nf.format(value)} $`;
}

/** "Stand 2016"-Suffix aus asOf; leer wenn kein asOf. */
export function asOfLabel(m: { asOf?: number } | undefined, fallback?: number): string {
  const year = m?.asOf ?? fallback;
  return year ? `Stand ${year}` : "";
}

export function drivingSide(side: "left" | "right"): string {
  return side === "left" ? "links" : "rechts";
}

export function unMembershipLabel(s: "member" | "observer" | "non-member"): string {
  switch (s) {
    case "member": return "UN-Mitglied";
    case "observer": return "UN-Beobachter";
    case "non-member": return "Kein UN-Mitglied";
  }
}
