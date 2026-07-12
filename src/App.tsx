import { useState } from "react";
import { ExploreView } from "./components/ExploreView";
import { CompareView } from "./components/CompareView";
import { RankingsView } from "./components/RankingsView";

type View = "explore" | "compare" | "rankings";

const TABS: { key: View; label: string }[] = [
  { key: "explore", label: "Steckbrief" },
  { key: "compare", label: "Vergleich" },
  { key: "rankings", label: "Rankings" },
];

export function App() {
  const [view, setView] = useState<View>("explore");
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const startCompare = (id: string) => {
    setCompareIds((prev) => (prev.includes(id) ? prev : [...prev, id]).slice(0, 4));
    setView("compare");
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
        {view === "explore" && <ExploreView onCompare={startCompare} />}
        {view === "compare" && <CompareView ids={compareIds} setIds={setCompareIds} />}
        {view === "rankings" && <RankingsView />}
      </div>
    </div>
  );
}
