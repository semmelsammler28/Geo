import { useMemo, useState } from "react";
import mapData from "../data/world-map.json";
import { countries, getCountry } from "../data/countries";
import { METRICS, coverage, metricByKey } from "../lib/metrics";

interface Shape {
  cca3: string | null;
  name: string;
  d: string;
}
const MAP = mapData as { width: number; height: number; shapes: Shape[] };

const NO_DATA = "#c7ccd4";
// Choropleth-Verlauf hell -> kräftiges Blau (auf hell und dunkel lesbar).
const LOW = [219, 233, 252];
const HIGH = [23, 55, 143];
function color(t: number): string {
  const c = LOW.map((lo, i) => Math.round(lo + (HIGH[i] - lo) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function MapView({ onOpenCountry }: { onOpenCountry: (id: string) => void }) {
  const [metricKey, setMetricKey] = useState("population");
  const [hover, setHover] = useState<{ name: string; value: string } | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const metric = metricByKey.get(metricKey)!;

  // Perzentil je Land (robuster als linear bei stark schiefen Verteilungen).
  const percentile = useMemo(() => {
    const vals: { id: string; v: number }[] = [];
    for (const c of countries) {
      const v = metric.get(c);
      if (v != null) vals.push({ id: c.id, v });
    }
    vals.sort((a, b) => a.v - b.v);
    const map = new Map<string, number>();
    const n = vals.length;
    vals.forEach((x, i) => map.set(x.id, n > 1 ? i / (n - 1) : 1));
    return map;
  }, [metric]);

  const fillFor = (s: Shape): string => {
    if (!s.cca3) return NO_DATA;
    const t = percentile.get(s.cca3);
    return t == null ? NO_DATA : color(t);
  };

  const showHover = (s: Shape) => {
    if (!s.cca3) return setHover({ name: s.name, value: "keine Daten" });
    const c = getCountry(s.cca3);
    const v = c ? metric.get(c) : undefined;
    setHover({ name: s.name, value: v != null ? metric.format(v) : "keine Daten" });
  };

  return (
    <div className="mapview">
      <div className="map-controls">
        <label>
          Einfärben nach
          <select value={metricKey} onChange={(e) => setMetricKey(e.target.value)}>
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
        <div className="map-legend">
          <span className="muted">niedrig</span>
          <span className="legend-bar" />
          <span className="muted">hoch</span>
        </div>
      </div>

      <div
        className="map-wrap"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
        }}
        onMouseLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${MAP.width} ${MAP.height}`} className="map-svg" role="img" aria-label="Weltkarte">
          {MAP.shapes.map((s, i) => (
            <path
              key={s.cca3 ?? `x${i}`}
              d={s.d}
              fill={fillFor(s)}
              className={s.cca3 ? "country clickable" : "country"}
              onMouseEnter={() => showHover(s)}
              onClick={() => s.cca3 && onOpenCountry(s.cca3)}
            />
          ))}
        </svg>
        {hover ? (
          <div className="map-tooltip" style={{ left: pos.x + 12, top: pos.y + 12 }}>
            <strong>{hover.name}</strong>
            <span className="muted"> · {hover.value}</span>
          </div>
        ) : null}
      </div>
      <p className="list-count">Klick auf ein Land öffnet den Steckbrief · {coverage(metric, countries)} Länder mit Daten für „{metric.label}"</p>
    </div>
  );
}
