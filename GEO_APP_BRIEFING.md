# 🌍 Geo Lernapp v2 — Projekt-Briefing für Claude Code

Stand: 12. Juli 2026 · Vorgänger-Version: `geo-v3` (siehe `UEBERGABE.md` als Referenz für Altlogik/gelernte Lektionen)

## 0. Kontext für Claude Code

Dies ist ein **Neubau**, kein Feature-Patch. Die alte Version (`UEBERGABE.md` im
selben Ordner) war ein reines Quiz/Karteikarten-Tool mit sehr dünnem
Datenmodell (6 Felder/Land). Dieses Dokument beschreibt die neue Zielversion.
Bitte dieses Dokument am Anfang jeder Session lesen, bevor du Code schreibst.

**Plattform-Entscheidung:** v1 läuft ausschließlich am PC (Browser), **keine
Mobile-Optimierung nötig**. Später (separates Projekt) wird daraus über
Capacitor eine iOS-App gebaut — das beeinflusst v1 nicht, außer dass die
Code-Architektur diese spätere Migration nicht unnötig erschweren sollte
(sauber getrennte Logik von Darstellung, kein Browser-only-Hack, der sich
später rächt).

---

## 1. Vision

Eine App, mit der man **jedes Land der Erde extrem genau kennenlernen**,
**mehrere Länder direkt vergleichen** und **beliebige Statistiken/Rankings**
einsehen kann — nicht nur Quiz-Fakten auswendig lernen, sondern echtes
Verständnis inkl. Verortung auf der Karte.

Drei gleichberechtigte Säulen:
1. **Lernen** (Quiz, Karteikarten — aus v1 übernehmen & verbessern)
2. **Erkunden** (Länder-Steckbrief, Karte, Vergleich — neu)
3. **Einordnen** (Rankings, Statistiken, "wo steht Land X im Vergleich" — neu)

---

## 2. Scope-Entscheidungen (bitte am Anfang fixieren, nicht später stillschweigend variieren)

Diese Fragen müssen VOR dem Datenmodell-Bau entschieden werden. Vorschlag,
zur Bestätigung/Änderung durch Laura:

- **Ländermenge**: 193 UN-Mitgliedstaaten + 2 UN-Beobachter (Vatikanstadt,
  Palästina) = 195. Taiwan als Sonderfall mit klar gekennzeichnetem Status
  ergänzen (De-facto-Souveränität, kein UN-Mitglied) statt komplett
  wegzulassen. Keine abhängigen Gebiete (Grönland, Puerto Rico, Hongkong)
  als eigene "Länder" — aber ggf. als Zusatzinfo beim jeweiligen Mutterstaat
  erwähnen.
- **Mehrfach-Hauptstädte**: explizit als Array modellieren, nicht als
  einzelner String (betrifft z. B. Südafrika: Pretoria/Kapstadt/
  Bloemfontein; Bolivien: La Paz/Sucre; Niederlande: Amsterdam/Den Haag).
  Im Quiz wird primär die administrative/Regierungssitz-Hauptstadt
  abgefragt, der Steckbrief zeigt aber alle.
- **Politisch sensible Fälle** (Kosovo-Anerkennung, Jerusalem als
  Hauptstadt, Westsahara): neutral, faktenbasiert, mit kurzer Anmerkung
  zum Streitstand darstellen statt einseitig zu entscheiden.
- **Datenstand/Aktualität**: jedes Datenfeld, das sich ändern kann
  (Bevölkerung, Regierungschef, BIP), bekommt ein `asOf`-Jahr im Datensatz.
  Kein Anspruch auf Live-Aktualität, aber Transparenz über den Stand.

---

## 3. Datenmodell (Kernstück des Neubaus)

Von 6 auf ca. 25-30 Felder pro Land erweitern. Kategorien:

- **Geografie**: Koordinaten (für Karte), Nachbarländer, Kontinent +
  Subregion, höchster Punkt, größter Fluss/See, Klimazone(n), Zeitzone(n),
  Küstenlinie ja/nein
- **Politik**: Regierungsform, Staatsoberhaupt/Regierungschef (+ `asOf`),
  UN-Mitgliedschaft, Unabhängigkeitsjahr, wichtige Bündnisse (EU/NATO/
  ASEAN/AU etc.)
- **Wirtschaft**: BIP, BIP/Kopf, Währung, HDI
- **Gesellschaft**: Amtssprache(n), weitere verbreitete Sprachen,
  Hauptreligionen, Lebenserwartung
- **Praktisches**: Vorwahl, Kfz-Kennzeichen, Fahrseite, Steckertyp,
  Internet-TLD
- **Kultur**: Wahrzeichen, UNESCO-Welterbestätten (Anzahl + Beispiele),
  Nationalgericht, Nationalfeiertag
- **Kuriositäten** (eigenes Feld für "Wusstest du?"-Content): Exklaven,
  fehlender Meerzugang, mehrere Zeitzonen, kein stehendes Militär etc. —
  wo zutreffend

**Datenquelle**: nicht von Hand tippen (fehleranfällig bei 195 Ländern).
Einmalig aus verlässlicher, strukturierter Quelle ziehen (z. B. REST
Countries API oder vergleichbare offene Datenbank + Abgleich CIA World
Factbook für Lücken), lokal einfrieren, dann Skript zur Validierung gegen
Tippfehler/Ausreißer (z. B. Plausibilitätscheck: Bevölkerungsdichte in
sinnvollem Bereich).

**Architektur**: Länderdaten als separates JSON/JS-Modul, nicht mehr
inline in einer Riesen-HTML-Datei. Build-Prozess (Vite) für saubere
Modultrennung: `data/countries.json`, `logic/quiz-engine.js`,
`logic/similarity.js`, `components/...` etc.

---

## 4. Feature-Bausteine

### 4.1 Quiz-Engine — Distraktor-/Ähnlichkeitslogik (wichtigster Fix ggü. v1)

Kernproblem in v1: Antwortoptionen waren zu beliebig gewählt, dadurch per
Ausschlussverfahren leicht zu erraten (Beispiel Flaggen-Quiz).

**Lösung**: pro Quiz-Typ eine Ähnlichkeitsbasis für Distraktor-Auswahl,
nicht Zufallsziehung aus dem Gesamtpool:
- Flaggen: vordefinierte Cluster visuell ähnlicher Flaggen (Farbschema +
  Layout-Typ: Trikolore, Kreuz, Sterne/Mondsichel etc.). Hard Mode zieht
  Distraktoren bevorzugt aus demselben Cluster, Easy Mode aus
  unterschiedlichen Clustern.
- Hauptstädte: Distraktoren aus derselben Region/Kontinent ziehen.
- Bevölkerung/Fläche: Distraktoren in ähnlicher Größenordnung (Faktor
  0,5–2× des korrekten Werts), nicht beliebige Werte.
- Kontinente: transkontinentale Grenzfälle (Russland, Türkei, Kasachstan,
  Ägypten) bewusst als anspruchsvolle Fragen einbauen statt vermeiden.

### 4.2 Adaptive Schwierigkeit / Mastery-Tracking

Pro Land + Quiz-Typ ein Mastery-Level führen (nicht nur binär gewusst/
nicht gewusst). Schwache Länder werden häufiger gezeigt, gemeisterte
seltener — ähnliches Prinzip wie Spaced Repetition, aber auch fürs
Quiz nutzbar, nicht nur Karteikarten.

### 4.3 Länder-Steckbrief (Detailansicht)

Vollständige Übersichtsseite pro Land mit allen Datenfeldern aus Abschnitt
3, sauber gruppiert nach Kategorie. Ersetzt/erweitert das bisherige
"Wissen"-Feature (AI-Fun-Facts bleiben als Zusatzbaustein bestehen,
ergänzen aber die strukturierten Fakten, ersetzen sie nicht).

### 4.4 Vergleichsansicht (bisher komplett fehlend)

2–4 Länder nebeneinander, alle Kernstats als Tabelle + visuelle
Balken/Skalen (kein reiner Zahlenvergleich). Direkter Einstieg z. B. aus
dem Steckbrief heraus ("mit anderem Land vergleichen").

### 4.5 Rankings/Statistik-Ansicht (bisher komplett fehlend)

Sortierbare Listen pro Metrik (größte/kleinste, bevölkerungsreichste,
höchstes BIP/Kopf etc.), mit Perzentil-Einordnung eines gewählten Landes
("Deutschland liegt bei Fläche auf Platz 62 von 195").

### 4.6 Interaktive Weltkarte (bisher komplett fehlend)

Klickbare Karte als Navigationseinstieg, optional Choropleth-Einfärbung
nach wählbarer Metrik (Bevölkerungsdichte, BIP/Kopf etc.). Wichtig fürs
eigentliche Ziel: Verortung, nicht nur Faktenwissen.

### 4.7 Aus v1 übernehmen & verbessern
- Quiz-Modi (Hauptstädte/Flaggen/Kontinente/Bevölkerung/Fläche/Gemischt) —
  mit neuer Distraktor-Logik
- Karteikarten — plus Spaced-Repetition-Algorithmus statt einfachem
  Wiederholungs-Pool
- Fehleranalyse am Quiz-Ende (in v1 als offene Idee vermerkt, jetzt
  umsetzen): am Ende zeigen, welche Länder falsch beantwortet wurden, mit
  direktem Sprung zum Steckbrief
- Ergebnis-Historie statt nur bestem Streak (Verlauf über Zeit sichtbar)

---

## 5. Nicht Teil von v1 (bewusst zurückgestellt)

- Mobile-/Touch-Optimierung, Safe-Area-Handling etc. (kommt erst bei der
  späteren nativen iOS-Version)
- Haptics, Sound-Feedback
- Mehrsprachigkeit (Englisch etc.)
- Offline-Fähigkeit / Service Worker (v1 läuft am PC mit Internetzugang)
- API-Key-Proxy-Server für die AI-Fun-Facts (v1 nutzt weiterhin eigenen
  Anthropic-Key lokal wie in v1)

---

## 6. Empfohlene Reihenfolge

1. Scope-Entscheidungen aus Abschnitt 2 mit Laura final abstimmen
2. Datenmodell + Datenquelle + Validierungsskript aufbauen (Fundament,
   alles andere hängt daran)
3. Länder-Steckbrief (macht das neue Datenmodell sofort sichtbar/testbar)
4. Vergleichsansicht + Rankings
5. Quiz-Engine mit Ähnlichkeits-/Distraktor-Logik neu bauen
6. Karteikarten mit Mastery-Tracking
7. Interaktive Karte
8. Politur: Fehleranalyse, Ergebnis-Historie, Design-Feinschliff

**Modell-Empfehlung**: Opus für Schritt 2 und 5 (komplexe, zusammen-
hängende Architekturentscheidungen). Sonnet für die übrigen Schritte
und alle späteren kleineren Anpassungen.
