import { useMemo, useState } from "react";
import { countries, displayName } from "../data/countries";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function CountryList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () => [...countries].sort((a, b) => displayName(a).localeCompare(displayName(b), "de")),
    []
  );

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        norm(displayName(c)).includes(q) ||
        norm(c.names.common).includes(q) ||
        c.codes.cca3.toLowerCase().includes(q)
    );
  }, [query, sorted]);

  return (
    <nav className="country-list">
      <input
        className="search"
        type="search"
        placeholder="Land suchen…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Land suchen"
      />
      <p className="list-count">{filtered.length === 1 ? "1 Land" : `${filtered.length} Länder`}</p>
      <ul>
        {filtered.map((c) => (
          <li key={c.id}>
            <button
              className={c.id === selectedId ? "active" : ""}
              onClick={() => onSelect(c.id)}
            >
              <span className="li-flag" aria-hidden>{c.flag.emoji ?? "🏳️"}</span>
              <span className="li-name">{displayName(c)}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
