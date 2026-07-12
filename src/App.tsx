import { useState } from "react";
import { getCountry, countries } from "./data/countries";
import { ExploreView } from "./components/ExploreView";
import { CompareView } from "./components/CompareView";
import { RankingsView } from "./components/RankingsView";
import { QuizView } from "./components/QuizView";
import { FlashcardsView } from "./components/FlashcardsView";
import { MapView } from "./components/MapView";

type View = "explore" | "compare" | "rankings" | "map" | "quiz" | "flashcards";

// Gruppiert nach den drei Säulen des Briefings: Erkunden, Einordnen, Lernen.
const TAB_GROUPS: { pillar: string; tabs: { key: View; label: string }[] }[] = [
  { pillar: "Erkunden", tabs: [
    { key: "explore", label: "Steckbrief" },
    { key: "compare", label: "Vergleich" },
    { key: "map", label: "Karte" },
  ] },
  { pillar: "Einordnen", tabs: [
    { key: "rankings", label: "Rankings" },
  ] },
  { pillar: "Lernen", tabs: [
    { key: "quiz", label: "Quiz" },
    { key: "flashcards", label: "Karteikarten" },
  ] },
];

const DEFAULT_ID = getCountry("DEU") ? "DEU" : countries[0]?.id ?? null;

export function App() {
  const [view, setView] = useState<View>("explore");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(DEFAULT_ID);

  const startCompare = (id: string) => {
    setCompareIds((prev) => (prev.includes(id) ? prev : [...prev, id]).slice(0, 4));
    setView("compare");
  };

  const openCountry = (id: string) => {
    setSelectedId(id);
    setView("explore");
  };

  return (
    <div className="app">
      <header className="topnav">
        <div className="brand">
          <span className="brand-mark">🌍</span>
          <span className="brand-text">
            <span className="brand-name">Geo Lernapp</span>
            <span className="brand-sub">erkunden · einordnen · lernen</span>
          </span>
        </div>
        <nav className="tabs">
          {TAB_GROUPS.map((g, gi) => (
            <div className="tab-group" key={g.pillar}>
              {gi > 0 ? <span className="tab-sep" aria-hidden /> : null}
              {g.tabs.map((t) => (
                <button
                  key={t.key}
                  className={view === t.key ? "tab active" : "tab"}
                  onClick={() => setView(t.key)}
                  title={g.pillar}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </header>

      <div className="view">
        {view === "explore" && (
          <ExploreView selectedId={selectedId} onSelect={setSelectedId} onCompare={startCompare} />
        )}
        {view === "compare" && <CompareView ids={compareIds} setIds={setCompareIds} />}
        {view === "rankings" && <RankingsView />}
        {view === "map" && <MapView onOpenCountry={openCountry} />}
        {view === "quiz" && <QuizView onOpenCountry={openCountry} />}
        {view === "flashcards" && <FlashcardsView />}
      </div>
    </div>
  );
}
