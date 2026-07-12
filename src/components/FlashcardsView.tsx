import { useMemo, useState } from "react";
import { countries, displayName, getCountry } from "../data/countries";
import { buildSession, grade as gradeCard, stats, type Grade, type Topic } from "../logic/mastery";
import type { Country } from "../types/country";

const DECKS: { key: Topic; label: string }[] = [
  { key: "capitals", label: "Hauptstädte" },
  { key: "flags", label: "Flaggen" },
  { key: "continents", label: "Kontinente" },
];

const CONTINENT_DE: Record<string, string> = {
  Africa: "Afrika", Asia: "Asien", Europe: "Europa",
  "North America": "Nordamerika", "South America": "Südamerika",
  Oceania: "Ozeanien", Antarctica: "Antarktis",
};

const allIds = countries.map((c) => c.id);
const capitalOf = (c: Country) => (c.capitals.find((k) => k.isPrimaryForQuiz) ?? c.capitals[0])?.name ?? "—";

function face(topic: Topic, c: Country): { front: JSX.Element; back: string } {
  switch (topic) {
    case "capitals":
      return {
        front: <><span className="fc-flag-inline">{c.flag.emoji}</span> Wie heißt die Hauptstadt von <strong>{displayName(c)}</strong>?</>,
        back: capitalOf(c),
      };
    case "flags":
      return {
        front: <div className="fc-flag-big">{c.flag.emoji}</div>,
        back: displayName(c),
      };
    case "continents":
      return {
        front: <>Auf welchem Kontinent liegt <strong>{displayName(c)}</strong>?</>,
        back: CONTINENT_DE[c.geography.continent] ?? c.geography.continent,
      };
  }
}

export function FlashcardsView() {
  const [phase, setPhase] = useState<"setup" | "learning" | "done">("setup");
  const [topic, setTopic] = useState<Topic>("capitals");
  const [queue, setQueue] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  // Nur zum Neuberechnen der Statistik nach Sitzungen.
  const [tick, setTick] = useState(0);

  const deckStats = useMemo(() => DECKS.map((d) => ({ ...d, s: stats(d.key, allIds) })), [tick]);

  const start = () => {
    const session = buildSession(topic, allIds, { maxNew: 12, maxTotal: 20 });
    setQueue(session);
    setRevealed(false);
    setReviewed(0);
    setPhase(session.length ? "learning" : "done");
  };

  const currentId = queue[0];
  const current = currentId ? getCountry(currentId) : undefined;

  const answer = (g: Grade) => {
    if (!currentId) return;
    gradeCard(topic, currentId, g);
    setReviewed((n) => n + 1);
    setRevealed(false);
    const [head, ...rest] = queue;
    // "Nochmal" -> ans Ende der Sitzung, sonst raus.
    const nextQueue = g === "again" ? [...rest, head] : rest;
    setQueue(nextQueue);
    if (nextQueue.length === 0) {
      setPhase("done");
      setTick((t) => t + 1);
    }
  };

  if (phase === "setup") {
    return (
      <div className="flashcards fc-setup">
        <h1>Karteikarten</h1>
        <p className="quiz-lead">Spaced Repetition: schwache Karten kommen häufiger, gemeisterte seltener. Fortschritt wird lokal gespeichert.</p>
        <div className="deck-grid">
          {deckStats.map((d) => (
            <button
              key={d.key}
              className={topic === d.key ? "deck active" : "deck"}
              onClick={() => setTopic(d.key)}
            >
              <span className="deck-label">{d.label}</span>
              <span className="deck-stats">
                {d.s.due} fällig · {d.s.mastered}/{d.s.total} gemeistert
              </span>
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={start}>Lernen starten</button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flashcards fc-done">
        <h1>Sitzung beendet</h1>
        <p className="score-big">{reviewed} Karten</p>
        <p className="quiz-lead">
          {DECKS.find((d) => d.key === topic)?.label}: {stats(topic, allIds).mastered}/{allIds.length} gemeistert ·{" "}
          {stats(topic, allIds).due} fällig
        </p>
        <button className="btn-primary" onClick={() => setPhase("setup")}>Zurück zur Auswahl</button>
      </div>
    );
  }

  if (!current) return <div className="flashcards"><p className="empty">Keine Karten.</p></div>;
  const { front, back } = face(topic, current);

  return (
    <div className="flashcards fc-learn">
      <div className="quiz-progress">
        <span>Noch {queue.length} Karten</span>
        <span>Bewertet: {reviewed}</span>
      </div>
      <div className="fc-card">
        <div className="fc-front">{front}</div>
        {revealed ? <div className="fc-back">{back}</div> : null}
      </div>
      {revealed ? (
        <div className="fc-grades">
          <button className="grade again" onClick={() => answer("again")}>Nochmal</button>
          <button className="grade good" onClick={() => answer("good")}>Gut</button>
          <button className="grade easy" onClick={() => answer("easy")}>Einfach</button>
        </div>
      ) : (
        <button className="btn-primary" onClick={() => setRevealed(true)}>Antwort zeigen</button>
      )}
    </div>
  );
}
