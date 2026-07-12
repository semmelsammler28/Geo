import { useState } from "react";
import { countries, getCountry } from "../data/countries";
import { CountryList } from "./CountryList";
import { Steckbrief } from "./Steckbrief";

const DEFAULT_ID = getCountry("DEU") ? "DEU" : countries[0]?.id ?? null;

export function ExploreView({ onCompare }: { onCompare: (id: string) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(DEFAULT_ID);
  const country = selectedId ? getCountry(selectedId) : undefined;

  return (
    <div className="explore">
      <aside className="sidebar">
        <CountryList selectedId={selectedId} onSelect={setSelectedId} />
      </aside>
      <main className="main">
        {country ? (
          <Steckbrief country={country} onCompare={onCompare} />
        ) : (
          <p className="empty">Kein Land ausgewählt.</p>
        )}
      </main>
    </div>
  );
}
