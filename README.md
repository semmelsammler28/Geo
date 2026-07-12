# 🌍 Geo Lernapp v2

Länder erkunden, vergleichen, einordnen und lernen. Neubau gemäß
`GEO_APP_BRIEFING.md`. v1 läuft am PC im Browser.

## Schnellstart

```bash
npm install
npm run dev        # Entwicklungsserver (Vite) auf http://localhost:5173
```

## Projektstruktur

```
schema/            JSON-Schema als Quelle der Wahrheit für das Datenmodell
scripts/           Datenpipeline (offline-Build, Refresh, Validierung)
data/              Eingefrorene Länderdaten (countries.json, 197 Länder)
src/               Frontend (React + TypeScript)
  types/           TypeScript-Spiegel des Schemas
  data/            Datenanbindung + Lookups
  lib/             Formatierhelfer
  components/      UI (Steckbrief, Länderliste, …)
docs/              Dokumentation (Datenpipeline)
```

Logik (`data/`, `scripts/`) ist bewusst von der Darstellung (`src/`) getrennt —
das erleichtert die spätere Capacitor-/iOS-Migration (eigenes Projekt).

## Skripte

| Befehl | Zweck |
|--------|-------|
| `npm run dev` | Frontend-Entwicklungsserver |
| `npm run build` | Typecheck + Produktions-Build der App |
| `npm run preview` | Produktions-Build lokal ansehen |
| `npm run data:build` | Länderdaten offline aus npm-Quellen bauen |
| `npm run data:validate` | Daten gegen Schema + Plausibilität prüfen |
| `npm run data:refresh` | Optional: frische Zahlen aus REST Countries (braucht Netz) |

Details zur Datenpipeline: `docs/DATEN-PIPELINE.md`.

## Stand

- **Datenfundament** (Schritt 2): Schema, Ingestion, Validierung — 197 Länder,
  0 Validierungsfehler.
- **Länder-Steckbrief** (Schritt 3): Detailansicht pro Land mit allen
  Datenkategorien, durchsuchbare Länderliste.
- **Vergleich + Rankings** (Schritt 4): 2–4 Länder mit visuellen Balken;
  sortierbare Rankings mit Perzentil-Einordnung.
- **Quiz-Engine** (Schritt 5): Hauptstädte/Flaggen/Kontinente/Bevölkerung/Fläche/
  Gemischt mit Ähnlichkeits-/Distraktor-Logik; Fehleranalyse mit Steckbrief-Sprung.
- **Karteikarten + Mastery** (Schritt 6): Spaced Repetition (SM-2-artig),
  lokal persistiert; geteilte Mastery-Schicht macht auch das Quiz adaptiv.
- **Interaktive Weltkarte** (Schritt 7): Choropleth nach wählbarer Metrik
  (offline projiziert aus Natural-Earth-Geometrien), Klick öffnet den Steckbrief.
- **Politur** (Schritt 8): Ergebnis-Historie der Quiz-Läufe, nach den drei
  Säulen gruppierte Navigation, Design-Feinschliff.

Alle acht Schritte des Briefings sind umgesetzt.
