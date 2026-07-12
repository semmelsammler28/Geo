import { useState } from "react";
import { getCountry, countries } from "./data/countries";
import { ExploreView } from "./components/ExploreView";
import { CompareView } from "./components/CompareView";
import { RankingsView } from "./components/RankingsView";
import { QuizView } from "./components/QuizView";
import { FlashcardsView } from "./components/FlashcardsView";

type View = "explore" | "compare" | "rankings" | "quiz" | "flashcards";

const TABS: { key: View; label: string }[] = [
  { key: "explore", label: "Steckbrief" },
  { key: "compare", label: "Vergleich" },
  { key: "rankings", label: "Rankings" },
  { key: "quiz", label: "Quiz" },
  { key: "flashcards", label: "Karteikarten" },
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
          <span className="brand-name">Geo Lernapp</span>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={view === t.key ? "tab active" : "tab"}
              onClick={() => setView(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="view">
        {view === "explore" && (
          <ExploreView selectedId={selectedId} onSelect={setSelectedId} onCompare={startCompare} />
        )}
        {view === "compare" && <CompareView ids={compareIds} setIds={setCompareIds} />}
        {view === "rankings" && <RankingsView />}
        {view === "quiz" && <QuizView onOpenCountry={openCountry} />}
        {view === "flashcards" && <FlashcardsView />}
      </div>
    </div>
  );
}
