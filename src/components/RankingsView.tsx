import { useMemo, useState } from "react";
import { countries, displayName } from "../data/countries";
import { METRICS, coverage, metricByKey } from "../lib/metrics";
import type { Country } from "../types/country";

const sortedForSelect = [...countries].sort((a, b) =>
  displayName(a).localeCompare(displayName(b), "de")
);

export function RankingsView() {
  const [metricKey, setMetricKey] = useState("population");
  const [direction, setDirection] = useState<"desc" | "asc">("desc");
  const [focusId, setFocusId] = useState<string>("DEU");

  const metric = metricByKey.get(metricKey)!;

  const ranked = useMemo(() => {
    const withValues = countries
      .map((c) => ({ c, v: metric.get(c) }))
      .filter((x): x is { c: Country; v: number } => x.v != null);
    withValues.sort((a, b) => (direction === "desc" ? b.v - a.v : a.v - b.v));
    return withValues;
  }, [metric, direction]);

  const max = ranked.length ? Math.max(...ranked.map((x) => x.v)) : 1;
  const focusRank = ranked.findIndex((x) => x.c.id === focusId);
  const cov = coverage(metric, countries);

  return (
    <div className="rankings">
      <div className="rank-controls">
        <label>
          Metrik
          <select value={metricKey} onChange={(e) => {
            setMetricKey(e.target.value);
            setDirection(metricByKey.get(e.target.value)!.direction);
          }}>
            {METRICS.map((m) => {
              const c = coverage(m, countries);
              return (
                <option key={m.key} value={m.key} disabled={c === 0}>
                  {m.label}{c === 0 ? " (noch keine Daten)" : ""}
                </option>
              );
            })}
          </select>
        </label>
        <label>
          Reihenfolge
          <select value={direction} onChange={(e) => setDirection(e.target.value as "desc" | "asc")}>
            <option value="desc">größte zuerst</option>
            <option value="asc">kleinste zuerst</option>
          </select>
        </label>
        <label>
          Land hervorheben
          <select value={focusId} onChange={(e) => setFocusId(e.target.value)}>
            {sortedForSelect.map((c) => (
              <option key={c.id} value={c.id}>{displayName(c)}</option>
            ))}
          </select>
        </label>
      </div>

      {focusRank >= 0 ? (
        <p className="rank-summary">
          <strong>{displayName(ranked[focusRank].c)}</strong> liegt bei{" "}
          <strong>{metric.label}</strong> auf <strong>Platz {focusRank + 1}</strong> von{" "}
          {ranked.length} · {metric.format(ranked[focusRank].v)}
        </p>
      ) : (
        <p className="rank-summary muted">
          Für das hervorgehobene Land liegen bei „{metric.label}" noch keine Daten vor.
        </p>
      )}

      <p className="list-count">{cov} von {countries.length} Ländern mit Daten für diese Metrik</p>

      <ol className="rank-list">
        {ranked.map((x, i) => (
          <li key={x.c.id} className={x.c.id === focusId ? "focus" : ""}>
            <span className="rank-num">{i + 1}</span>
            <span className="rank-flag">{x.c.flag.emoji}</span>
            <span className="rank-name">{displayName(x.c)}</span>
            <span className="rank-bar-wrap">
              <span className="rank-bar" style={{ width: `${(x.v / max) * 100}%` }} />
            </span>
            <span className="rank-val">{metric.format(x.v)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
