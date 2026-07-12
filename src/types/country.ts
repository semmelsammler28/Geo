// TypeScript-Spiegel von schema/country.schema.json (Quelle der Wahrheit).
// Bei Schemaänderungen hier nachziehen. Optionale Felder = im Schema nicht required
// bzw. Tier-2/3-Lücken, die offline (noch) fehlen können.

export type UnMembership = "member" | "observer" | "non-member";

export type CapitalType =
  | "administrative"
  | "legislative"
  | "judicial"
  | "constitutional";

/** Zahlenwert, der sich ändern kann; asOf überschreibt den globalen dataSnapshot. */
export interface MeasuredNumber {
  value: number;
  asOf?: number;
  disputed?: boolean;
  disputeNote?: string;
}

export interface OfficeHolder {
  title: string;
  name: string;
  asOf?: number;
}

export interface Capital {
  name: string;
  type: CapitalType;
  isPrimaryForQuiz: boolean;
  disputed?: boolean;
  disputeNote?: string;
}

export interface Country {
  id: string;
  names: { common: string; official?: string; de?: string };
  codes: { cca2?: string; cca3: string; ccn3?: string };
  flag: { emoji?: string; svgUrl?: string };
  status: {
    unMembership: UnMembership;
    sovereigntyNote?: string;
    independenceYear?: number;
  };
  dependencies?: string[];
  capitals: Capital[];
  geography: {
    continent: string;
    subregion: string;
    coordinates: { lat: number; lng: number };
    neighbors: string[];
    landlocked: boolean;
    area?: MeasuredNumber;
    highestPoint?: { name: string; elevationM?: number };
    largestWaterBody?: string;
    climateZones?: string[];
    timezones?: string[];
  };
  politics?: {
    governmentForm?: string;
    headOfState?: OfficeHolder;
    headOfGovernment?: OfficeHolder;
    alliances?: string[];
  };
  economy: {
    gdpUsd?: MeasuredNumber;
    gdpPerCapitaUsd?: MeasuredNumber;
    hdi?: MeasuredNumber;
    currencies: { code: string; name?: string; symbol?: string }[];
  };
  society: {
    population?: MeasuredNumber;
    officialLanguages: string[];
    otherLanguages?: string[];
    mainReligions?: { name: string; sharePercent?: number }[];
    lifeExpectancyYears?: MeasuredNumber;
  };
  practical?: {
    callingCode?: string;
    carSigns?: string[];
    drivingSide?: "left" | "right";
    plugTypes?: string[];
    internetTld?: string[];
  };
  culture?: {
    landmarks?: string[];
    unescoSites?: { count: number; examples?: string[] };
    nationalDish?: string;
    nationalDay?: string;
  };
  funFacts?: string[];
  disputes?: { field: string; note: string }[];
  dataSnapshot: number;
  sources?: string[];
}
