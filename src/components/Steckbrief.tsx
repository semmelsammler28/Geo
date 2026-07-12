import type { Country, CapitalType } from "../types/country";
import { displayName, nameForId } from "../data/countries";
import { area, asOfLabel, drivingSide, num, usd, unMembershipLabel } from "../lib/format";
import { Section, Row, Badge } from "./ui";

const CAPITAL_TYPE_LABEL: Record<CapitalType, string> = {
  administrative: "Regierungssitz",
  legislative: "Parlamentssitz",
  judicial: "Gerichtssitz",
  constitutional: "verfassungsmäßig",
};

function join(list?: string[]): string {
  return list && list.length ? list.join(", ") : "";
}

export function Steckbrief({ country: c }: { country: Country }) {
  const geo = c.geography;
  const pol = c.politics ?? {};
  const eco = c.economy;
  const soc = c.society;
  const pra = c.practical ?? {};
  const cul = c.culture ?? {};

  const primaryCapital = c.capitals.find((k) => k.isPrimaryForQuiz) ?? c.capitals[0];

  return (
    <article className="steckbrief">
      <header className="sb-header">
        <span className="sb-flag" aria-hidden>
          {c.flag.emoji ?? "🏳️"}
        </span>
        <div className="sb-title">
          <h1>{displayName(c)}</h1>
          {c.names.official ? <p className="sb-official">{c.names.official}</p> : null}
          <div className="sb-badges">
            <Badge tone={c.status.unMembership}>{unMembershipLabel(c.status.unMembership)}</Badge>
            <span className="sb-code">{c.codes.cca3}</span>
            {primaryCapital ? <span className="sb-cap">Hauptstadt: {primaryCapital.name}</span> : null}
          </div>
          {c.status.sovereigntyNote ? (
            <p className="sb-note">{c.status.sovereigntyNote}</p>
          ) : null}
        </div>
      </header>

      <Section title="Geografie">
        <Row label="Kontinent">{geo.continent}</Row>
        <Row label="Subregion">{geo.subregion}</Row>
        <Row label="Hauptstädte">
          <ul className="capital-list">
            {c.capitals.map((k) => (
              <li key={k.name}>
                {k.isPrimaryForQuiz ? <span className="star" title="Quiz-Hauptstadt">★</span> : null}
                {k.name} <span className="muted">({CAPITAL_TYPE_LABEL[k.type]})</span>
                {k.disputed ? (
                  <span className="badge badge-disputed" title={k.disputeNote}>
                    umstritten
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Row>
        <Row label="Nachbarländer">
          {geo.neighbors.length ? geo.neighbors.map(nameForId).join(", ") : "keine (Insel/Grenzenlos)"}
        </Row>
        <Row label="Küste">{geo.landlocked ? "Binnenstaat (keine Küste)" : "mit Küste"}</Row>
        <Row label="Fläche" asOf={asOfLabel(geo.area)}>
          {geo.area ? area(geo.area.value) : ""}
        </Row>
        <Row label="Koordinaten">
          {`${geo.coordinates.lat.toFixed(1)}, ${geo.coordinates.lng.toFixed(1)}`}
        </Row>
        <Row label="Höchster Punkt">
          {geo.highestPoint
            ? `${geo.highestPoint.name}${geo.highestPoint.elevationM ? ` (${num(geo.highestPoint.elevationM)} m)` : ""}`
            : ""}
        </Row>
        <Row label="Größtes Gewässer">{geo.largestWaterBody}</Row>
        <Row label="Klimazonen">{join(geo.climateZones)}</Row>
        <Row label="Zeitzonen">{join(geo.timezones)}</Row>
      </Section>

      <Section title="Politik" show={Boolean(pol.governmentForm || pol.headOfState || pol.headOfGovernment || pol.alliances?.length || c.status.independenceYear)}>
        <Row label="Regierungsform">{pol.governmentForm}</Row>
        <Row label="Staatsoberhaupt" asOf={asOfLabel(pol.headOfState)}>
          {pol.headOfState ? `${pol.headOfState.name} (${pol.headOfState.title})` : ""}
        </Row>
        <Row label="Regierungschef" asOf={asOfLabel(pol.headOfGovernment)}>
          {pol.headOfGovernment ? `${pol.headOfGovernment.name} (${pol.headOfGovernment.title})` : ""}
        </Row>
        <Row label="Unabhängig seit">
          {c.status.independenceYear ? String(c.status.independenceYear) : ""}
        </Row>
        <Row label="Bündnisse">{join(pol.alliances)}</Row>
      </Section>

      <Section title="Wirtschaft" show={Boolean(eco.gdpUsd || eco.gdpPerCapitaUsd || eco.hdi || eco.currencies.length)}>
        <Row label="BIP" asOf={asOfLabel(eco.gdpUsd)}>{eco.gdpUsd ? usd(eco.gdpUsd.value) : ""}</Row>
        <Row label="BIP pro Kopf" asOf={asOfLabel(eco.gdpPerCapitaUsd)}>
          {eco.gdpPerCapitaUsd ? usd(eco.gdpPerCapitaUsd.value) : ""}
        </Row>
        <Row label="HDI" asOf={asOfLabel(eco.hdi)}>{eco.hdi ? eco.hdi.value.toFixed(3) : ""}</Row>
        <Row label="Währung">
          {eco.currencies.map((cur) => `${cur.name ?? cur.code}${cur.symbol ? ` (${cur.symbol})` : ""}`).join(", ")}
        </Row>
      </Section>

      <Section title="Gesellschaft">
        <Row label="Bevölkerung" asOf={asOfLabel(soc.population)}>
          {soc.population ? num(soc.population.value) : ""}
        </Row>
        <Row label="Amtssprachen">{join(soc.officialLanguages)}</Row>
        <Row label="Weitere Sprachen">{join(soc.otherLanguages)}</Row>
        <Row label="Hauptreligionen">
          {soc.mainReligions?.length
            ? soc.mainReligions.map((r) => `${r.name}${r.sharePercent != null ? ` (${r.sharePercent} %)` : ""}`).join(", ")
            : ""}
        </Row>
        <Row label="Lebenserwartung" asOf={asOfLabel(soc.lifeExpectancyYears)}>
          {soc.lifeExpectancyYears ? `${soc.lifeExpectancyYears.value.toFixed(1)} Jahre` : ""}
        </Row>
      </Section>

      <Section title="Praktisches" show={Boolean(pra.callingCode || pra.carSigns?.length || pra.drivingSide || pra.plugTypes?.length || pra.internetTld?.length)}>
        <Row label="Vorwahl">{pra.callingCode}</Row>
        <Row label="Kfz-Kennzeichen">{join(pra.carSigns)}</Row>
        <Row label="Fahrseite">{pra.drivingSide ? drivingSide(pra.drivingSide) : ""}</Row>
        <Row label="Steckertypen">{join(pra.plugTypes)}</Row>
        <Row label="Internet-TLD">{join(pra.internetTld)}</Row>
      </Section>

      <Section title="Kultur" show={Boolean(cul.landmarks?.length || cul.unescoSites || cul.nationalDish || cul.nationalDay)}>
        <Row label="Wahrzeichen">{join(cul.landmarks)}</Row>
        <Row label="UNESCO-Welterbe">
          {cul.unescoSites
            ? `${cul.unescoSites.count} Stätten${cul.unescoSites.examples?.length ? ` (z. B. ${cul.unescoSites.examples.join(", ")})` : ""}`
            : ""}
        </Row>
        <Row label="Nationalgericht">{cul.nationalDish}</Row>
        <Row label="Nationalfeiertag">{cul.nationalDay}</Row>
      </Section>

      <Section title="Wusstest du?" show={Boolean(c.funFacts?.length)}>
        {c.funFacts?.map((f, i) => (
          <Row key={i} label="•">{f}</Row>
        ))}
      </Section>

      {c.dependencies?.length ? (
        <Section title="Abhängige Gebiete">
          <Row label="Gebiete">{c.dependencies.join(", ")}</Row>
        </Section>
      ) : null}

      <footer className="sb-footer">
        <span>Datenstand: {c.dataSnapshot}</span>
        {c.sources?.length ? <span> · Quellen: {c.sources.join(" · ")}</span> : null}
      </footer>
    </article>
  );
}
