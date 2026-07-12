import { useMemo } from "react";
import { countries, displayName, getCountry } from "../data/countries";
import { unMembershipLabel } from "../lib/format";
import { METRICS } from "../lib/metrics";
import type { Country } from "../types/country";

const MAX_SLOTS = 4;

const sortedCountries = [...countries].sort((a, b) =>
  displayName(a).localeCompare(displayName(b), "de")
);

function textRows(c: Country): Record<string, string> {
  const cap = c.capitals.find((k) => k.isPrimaryForQuiz) ?? c.capitals[0];
  return {
    Kontinent: c.geography.continent,
    Hauptstadt: cap?.name ?? "—",
    Währung: c.economy.currencies.map((x) => x.code).join(", ") || "—",
    "UN-Status": unMembershipLabel(c.status.unMembership),
    Nachbarn: String(c.geography.neighbors.length),
  };
}

export function CompareView({
  ids,
  setIds,
}: {
  ids: string[];
  setIds: (ids: string[]) => void;
}) {
  const selected = useMemo(
    () => ids.map(getCountry).filter((c): c is Country => Boolean(c)),
    [ids]
  );

  const addCountry = (id: string) => {
    if (id && !ids.includes(id) && ids.length < MAX_SLOTS) setIds([...ids, id]);
  };
  const removeCountry = (id: string) => setIds(ids.filter((x) => x !== id));

  const metricRows = METRICS.filter((m) => selected.some((c) => m.get(c) != null));
  const textKeys = ["Kontinent", "Hauptstadt", "Währung", "UN-Status", "Nachbarn"];

  return (
    <div className="compare">
      <div className="compare-picker">
        {selected.map((c) => (
          <span key={c.id} className="chip">
            {c.flag.emoji} {displayName(c)}
            <button onClick={() => removeCountry(c.id)} aria-label="entfernen">×</button>
          </span>
        ))}
        {ids.length < MAX_SLOTS ? (
          <select
            className="add-select"
            value=""
            onChange={(e) => addCountry(e.target.value)}
          >
            <option value="">+ Land hinzufügen…</option>
            {sortedCountries
              .filter((c) => !ids.includes(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {displayName(c)}
                </option>
              ))}
          </select>
        ) : null}
      </div>

      {selected.length < 2 ? (
        <p className="empty">Wähle mindestens zwei Länder zum Vergleichen (bis zu {MAX_SLOTS}).</p>
      ) : (
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th className="metric-col"></th>
                {selected.map((c) => (
                  <th key={c.id}>
                    <span className="th-flag">{c.flag.emoji}</span>
                    <span>{displayName(c)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricRows.map((m) => {
                const values = selected.map((c) => m.get(c));
                const max = Math.max(...values.map((v) => v ?? 0), 1);
                return (
                  <tr key={m.key}>
                    <th className="metric-col">{m.label}</th>
                    {selected.map((c, i) => {
                      const v = values[i];
                      return (
                        <td key={c.id}>
                          {v == null ? (
                            <span className="muted">—</span>
                          ) : (
                            <div className="bar-cell">
                              <div className="bar" style={{ width: `${(v / max) * 100}%` }} />
                              <span className="bar-val">{m.format(v)}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {textKeys.map((key) => (
                <tr key={key}>
                  <th className="metric-col">{key}</th>
                  {selected.map((c) => (
                    <td key={c.id}>{textRows(c)[key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
