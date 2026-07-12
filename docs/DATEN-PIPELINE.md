# Datenfundament — Schema, Ingestion, Validierung

Umsetzung von Abschnitt 6, Schritt 2 des Briefings (`GEO_APP_BRIEFING.md`):
Datenmodell + Datenquelle + Validierungsskript. Alle weiteren Features hängen
an diesem Fundament.

## Struktur

```
schema/country.schema.json       Quelle der Wahrheit (JSON Schema, Draft 2020-12)
scripts/build-countries.mjs      Offline-Generator (npm-Daten) -> data/countries.json
scripts/refresh-countries.mjs    Optionales Overlay: frische Zahlen aus REST Countries API
scripts/validate-countries.mjs   Schema- + Plausibilitätsvalidierung
data/countries.json              Länderdaten (197 Länder, eingefroren)
data/_gaps.json                  Lückenreport (Tier-2/3-Felder pro Land)
```

## Ländermenge (fixiert)

197 Records = 193 UN-Mitglieder + 2 UN-Beobachter (Vatikan, Palästina) + Taiwan
+ Kosovo. Taiwan und Kosovo als de-facto-Staaten mit `status.unMembership:
"non-member"` und `sovereigntyNote`. Abhängige Gebiete (Grönland, Westsahara,
Hongkong …) sind **keine** eigenen Länder; als Nachbar auftauchende Nicht-Länder
(ESH, GIB, GUF, HKG, MAC) filtert der Build aus den `neighbors` heraus.

## Datenquellen und die drei Tiers

Die REST Countries / World Bank APIs sind in abgeschotteten Umgebungen (Proxy-
Policy) nicht erreichbar. Deshalb ist der **Offline-Build der Standardweg**; die
API dient nur zum optionalen Auffrischen.

- **Tier 1 — Struktur/Geografie** (npm `world-countries`, offline, aktuell):
  Namen inkl. deutsch, ISO-Codes, Hauptstädte, Nachbarn, Koordinaten, Fläche,
  Währungen, Sprachen, Binnenstaat, Flag-Emoji, UN-Status.
- **Tier 2 — veränderliche Zahlen**: Bevölkerung + Lebenserwartung offline aus
  npm `country-json` (Stand ~2016, als `asOf` markiert). BIP, BIP/Kopf, HDI,
  Zeitzonen, Fahrseite sind offline **nicht** verfügbar → Lücken (siehe
  `data/_gaps.json`), auffrischbar per `npm run refresh` (Zeitzonen, Fahrseite,
  frische Bevölkerung) bzw. später kuratiert (BIP/HDI).
- **Tier 3 — qualitativ/Factbook** (kuratiert, kein sauberer Feed):
  Regierungschef, Regierungsform, Bündnisse, Klima, höchster Punkt, größter
  Fluss/See, Wahrzeichen, UNESCO, Nationalgericht/-feiertag, Kuriositäten.

## Verwendung

```bash
npm install          # Abhängigkeiten (world-countries, country-json, ajv)
npm run build        # Offline: baut alle 197 Länder -> data/countries.json + _gaps.json
npm run validate     # Schema- und Plausibilitätscheck
npm run refresh      # optional, braucht Netz: frische Zahlen aus REST Countries als Overlay
```

`npm run refresh` überschreibt **nur** `society.population` (mit aktuellem
`asOf`), `geography.timezones` und `practical.drivingSide/carSigns`. Struktur,
Namen, Hauptstädte-Kuratierung, Status und Streitstände aus dem Build bleiben
unangetastet. In dieser Umgebung schlägt `refresh` mit 403 fehl (Proxy) — lokal
ausführen.

## Aktueller Stand

`npm run build && npm run validate` → **197 Länder, 0 Fehler**. Die Warnungen
sind ausschließlich Tier-2-Lücken (aktuell fehlende Zeitzonen an allen Ländern);
Bevölkerung ist für alle 197 gesetzt. Nach `npm run refresh` verschwinden die
Zeitzonen-Warnungen.

Status-Verteilung: 193 member · 2 observer (VAT, PSE) · 2 non-member (TWN, XKX).

## Validierungsregeln (über das Schema hinaus)

`scripts/validate-countries.mjs` prüft zusätzlich:

- **Eindeutige IDs** (cca3).
- **Quiz-Eindeutigkeit**: genau ein `capitals[].isPrimaryForQuiz` pro Land.
- **Referentielle Integrität** der `neighbors` (cca3 müssen existieren; ab 190
  Ländern harter Fehler).
- **Kein Land als eigener Nachbar**; **Binnenstaat ohne Nachbarn** unmöglich.
- **Bevölkerungsdichte-Ausreißer** (> 30.000/km² → wahrscheinlicher Zahlendreher).
- **HDI im Bereich 0..1**.
- **Kernstats-Vollständigkeit** (Bevölkerung, Zeitzonen) — als Warnung, da
  Tier-2-Lücken offline erwartbar sind.
- **Länderzahl** (Soll: 197).

Das JSON Schema selbst fängt Feldnamen-Tippfehler (`additionalProperties: false`
überall), Enum-Verstöße (Kontinent, Hauptstadt-Typ, `unMembership`), Wertebereiche
(Koordinaten, Prozentangaben) und fehlende Pflichtfelder.

## Entschiedene Detailfragen

- **Niederlande — Quiz-Hauptstadt**: `Amsterdam` ist die Quiz-Hauptstadt
  (verfassungsmäßige Hauptstadt, konventionelle Antwort); `Den Haag` erscheint
  als Regierungssitz nur im Steckbrief. (Laura, Juli 2026.)
- **Kosovo**: als 197. Land aufgenommen (de-facto-Staat, non-member), analog
  Taiwan. (Laura, Juli 2026.)
