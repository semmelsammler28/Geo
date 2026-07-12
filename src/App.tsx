import { useState } from "react";
import { countries, getCountry } from "./data/countries";
import { CountryList } from "./components/CountryList";
import { Steckbrief } from "./components/Steckbrief";

// Startland: Deutschland, sonst das erste alphabetisch.
const DEFAULT_ID = getCountry("DEU") ? "DEU" : countries[0]?.id ?? null;

export function App() {
  const [selectedId, setSelectedId] = useState<string | null>(DEFAULT_ID);
  const country = selectedId ? getCountry(selectedId) : undefined;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">🌍</span>
          <span className="brand-name">Geo Lernapp</span>
        </div>
        <CountryList selectedId={selectedId} onSelect={setSelectedId} />
      </aside>
      <main className="main">
        {country ? (
          <Steckbrief country={country} />
        ) : (
          <p className="empty">Kein Land ausgewählt.</p>
        )}
      </main>
    </div>
  );
}
