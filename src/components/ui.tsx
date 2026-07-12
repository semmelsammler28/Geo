import type { ReactNode } from "react";

/** Kategorie-Abschnitt. Rendert nichts, wenn `show` false ist (leere Kategorie ausblenden). */
export function Section({
  title,
  show = true,
  children,
}: {
  title: string;
  show?: boolean;
  children: ReactNode;
}) {
  if (!show) return null;
  return (
    <section className="section">
      <h2>{title}</h2>
      <dl className="rows">{children}</dl>
    </section>
  );
}

/** Eine Label/Wert-Zeile. Rendert nichts, wenn kein Wert übergeben wird. */
export function Row({
  label,
  asOf,
  disputed,
  disputeNote,
  children,
}: {
  label: string;
  asOf?: string;
  disputed?: boolean;
  disputeNote?: string;
  children?: ReactNode;
}) {
  if (children == null || children === "" || (Array.isArray(children) && children.length === 0)) {
    return null;
  }
  return (
    <div className="row">
      <dt>{label}</dt>
      <dd>
        <span className="value">{children}</span>
        {asOf ? <span className="badge badge-asof">{asOf}</span> : null}
        {disputed ? (
          <span className="badge badge-disputed" title={disputeNote}>
            umstritten
          </span>
        ) : null}
        {disputed && disputeNote ? <p className="dispute-note">{disputeNote}</p> : null}
      </dd>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "member" | "observer" | "non-member";
  title?: string;
}) {
  return (
    <span className={`badge badge-status badge-${tone}`} title={title}>
      {children}
    </span>
  );
}
