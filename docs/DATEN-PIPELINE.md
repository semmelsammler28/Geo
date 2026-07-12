# Datenfundament — Schema, Ingestion, Validierung

Umsetzung von Abschnitt 6, Schritt 2 des Briefings (`GEO_APP_BRIEFING.md`):
Datenmodell + Datenquelle + Validierungsskript. Alle weiteren Features hängen
an diesem Fundament.

## Struktur

```
schema/country.schema.json      Quelle der Wahrheit (JSON Schema, Draft 2020-12)
scripts/fetch-countries.mjs     Ingestion REST Countries v3.1 -> data/countries.json
scripts/validate-countries.mjs  Schema- + Plausibilitätsvalidierung
data/countries.json             Länderdaten (aktuell kuratierter Seed, s. u.)
data/_factbook-gaps.json         Lückenreport (wird vom Fetch erzeugt)
```

## Datenquelle (fixiert)

- **Basis: REST Countries API v3.1** — Geografie, Codes, Kern-Stats (Fläche,
  Bevölkerung), Praktisches (Vorwahl, Kfz, Fahrseite, TLD), Währungen, Sprachen.
- **Ergänzung: CIA World Factbook / Handpflege** — alles, was REST Countries
  nicht liefert (BIP, HDI, Regierungschef, Religionen, Klima, höchster Punkt,
  Wahrzeichen, UNESCO, Nationalgericht/-feiertag, Kuriositäten). Diese Felder
  listet `data/_factbook-gaps.json` pro Land als Worklist.

Prinzip aus dem Briefing: **nicht von Hand tippen**, einmalig aus verlässlicher
Quelle ziehen, lokal einfrieren, per Skript gegen Tippfehler/Ausreißer prüfen.

## Verwendung

```bash
npm install          # ajv + ajv-formats (nur devDependencies)
npm run fetch        # REST Countries -> data/countries.json + Lückenreport
npm run validate     # Schema- und Plausibilitätscheck
```

> **Netzhinweis:** `npm run fetch` braucht Zugriff auf `restcountries.com`. In
> abgeschotteten CI-/Web-Umgebungen mit strikter Proxy-Policy schlägt der Fetch
> mit 403 fehl — dann lokal (oder in einer Umgebung mit gelockerter Policy)
> ausführen. `data/countries.json` ist eingefroren und ins Repo eingecheckt,
> der Fetch ist ein einmaliger/gelegentlicher Ingestion-Schritt, kein Laufzeit-Call.

## Aktueller Stand

`data/countries.json` enthält derzeit einen **kuratierten Seed von 9 Ländern**,
der bewusst alle Grenzfälle aus Entscheidung 2.1 abdeckt und die Pipeline
beweist:

| Land | Testet |
|------|--------|
| DEU | Baseline (alle Kategorien) |
| ZAF | drei Hauptstädte (administrativ/legislativ/judikativ) |
| BOL | zwei Hauptstädte (Regierungssitz vs. Verfassungssitz) |
| NLD | zwei Hauptstädte + `dependencies[]` (Aruba etc.) |
| TWN | `unMembership: non-member` + `disputes` (Souveränität) |
| VAT | `unMembership: observer` + Kleinststaat |
| ISR | umstrittene Hauptstadt (`capitals[].disputed`) |
| XKX | umstrittene Souveränität + `independenceYear` |
| MCO | höchste Bevölkerungsdichte (Grenzfall Plausibilitätscheck) |

`npm run validate` → **0 Fehler**. Warnungen stammen erwartungsgemäß daraus,
dass die Nachbar-IDs auf noch nicht enthaltene Länder zeigen (referentielle
Integrität wird ab 190 Ländern zum harten Fehler) und dass die Länderzahl noch
nicht 196 ist. Nach dem echten `npm run fetch` entfallen diese.

## Validierungsregeln (über das Schema hinaus)

`scripts/validate-countries.mjs` prüft zusätzlich:

- **Eindeutige IDs** (cca3).
- **Quiz-Eindeutigkeit**: genau ein `capitals[].isPrimaryForQuiz` pro Land.
- **Referentielle Integrität** der `neighbors` (cca3 müssen existieren).
- **Kein Land als eigener Nachbar**; **Binnenstaat ohne Nachbarn** unmöglich.
- **Bevölkerungsdichte-Ausreißer** (> 30.000/km² → wahrscheinlicher Zahlendreher).
- **HDI im Bereich 0..1**.
- **Länderzahl** (Soll: 196 = 195 UN + Taiwan).

Das JSON Schema selbst fängt Feldnamen-Tippfehler (`additionalProperties: false`
überall), Enum-Verstöße (Kontinent, Hauptstadt-Typ, `unMembership`), Wertebereiche
(Koordinaten, Prozentangaben) und fehlende Pflichtfelder.

## Entschiedene Detailfragen

- **Niederlande — Quiz-Hauptstadt**: `Amsterdam` ist die Quiz-Hauptstadt
  (verfassungsmäßige Hauptstadt, konventionelle Antwort); `Den Haag` erscheint
  als Regierungssitz nur im Steckbrief. (Laura, Juli 2026.)
