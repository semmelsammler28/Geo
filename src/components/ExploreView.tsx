import { getCountry } from "../data/countries";
import { CountryList } from "./CountryList";
import { Steckbrief } from "./Steckbrief";

export function ExploreView({
  selectedId,
  onSelect,
  onCompare,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCompare: (id: string) => void;
}) {
  const country = selectedId ? getCountry(selectedId) : undefined;

  return (
    <div className="explore">
      <aside className="sidebar">
        <CountryList selectedId={selectedId} onSelect={onSelect} />
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
