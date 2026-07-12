import { useMemo, useState } from "react";
import { countries } from "../data/countries";
import { generateQuiz, type Difficulty, type Question, type QuizType } from "../logic/quiz-engine";
import { grade as gradeMastery, weight as masteryWeight, type Topic } from "../logic/mastery";
import { addResult, bestRate, getResults } from "../logic/history";

const dateFmt = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const MODE_LABEL: Record<string, string> = {
  capitals: "Hauptstädte", flags: "Flaggen", continents: "Kontinente",
  population: "Bevölkerung", area: "Fläche", mixed: "Gemischt",
};

const MASTERABLE: Topic[] = ["capitals", "flags", "continents"];
const isTopic = (t: string): t is Topic => (MASTERABLE as string[]).includes(t);

const MODES: { key: QuizType; label: string }[] = [
  { key: "capitals", label: "Hauptstädte" },
  { key: "flags", label: "Flaggen" },
  { key: "continents", label: "Kontinente" },
  { key: "population", label: "Bevölkerung" },
  { key: "area", label: "Fläche" },
  { key: "mixed", label: "Gemischt" },
];

const COUNT = 10;

interface Answer {
  q: Question;
  chosen: string;
  correct: boolean;
}

export function QuizView({ onOpenCountry }: { onOpenCountry: (id: string) => void }) {
  const [phase, setPhase] = useState<"setup" | "playing" | "done">("setup");
  const [type, setType] = useState<QuizType>("mixed");
  const [difficulty, setDifficulty] = useState<Difficulty>("hard");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);

  const start = () => {
    // adaptiv: schwache/ungesehene Länder häufiger fragen (geteilte Mastery-Schicht)
    const qs = generateQuiz(countries, { type, difficulty, count: COUNT }, Math.random, masteryWeight);
    setQuestions(qs);
    setIndex(0);
    setAnswers([]);
    setChosen(null);
    setPhase("playing");
  };

  const q = questions[index];
  const score = useMemo(() => answers.filter((a) => a.correct).length, [answers]);

  const choose = (label: string) => {
    if (chosen != null) return; // schon beantwortet
    const isCorrect = q.options.find((o) => o.label === label)?.correct ?? false;
    setChosen(label);
    setAnswers((prev) => [...prev, { q, chosen: label, correct: isCorrect }]);
    // Mastery aktualisieren (nur für Themen mit Karteikarten-Pendant)
    if (isTopic(q.type)) gradeMastery(q.type, q.subjectId, isCorrect ? "good" : "again");
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      addResult({ type, difficulty, score, total: questions.length });
      setPhase("done");
    } else {
      setIndex((i) => i + 1);
      setChosen(null);
    }
  };

  // --- Setup ---
  if (phase === "setup") {
    return (
      <div className="quiz quiz-setup">
        <h1>Quiz</h1>
        <p className="quiz-lead">Wähle einen Modus. Distraktoren werden gezielt aus verwechselbaren Ländern gezogen — kein Raten per Ausschluss.</p>
        <div className="mode-grid">
          {MODES.map((m) => (
            <button
              key={m.key}
              className={type === m.key ? "mode active" : "mode"}
              onClick={() => setType(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="diff-row">
          <span>Schwierigkeit:</span>
          <button className={difficulty === "easy" ? "seg active" : "seg"} onClick={() => setDifficulty("easy")}>Einfach</button>
          <button className={difficulty === "hard" ? "seg active" : "seg"} onClick={() => setDifficulty("hard")}>Schwer</button>
        </div>
        {(() => {
          const best = bestRate(type);
          return best != null ? (
            <p className="quiz-best">Bestwert in {MODE_LABEL[type]}: {Math.round(best * 100)} %</p>
          ) : null;
        })()}
        <button className="btn-primary" onClick={start}>{COUNT} Fragen starten</button>
        {getResults().length > 0 ? (
          <div className="history">
            <h2>Verlauf</h2>
            <ul>
              {getResults().slice(0, 8).map((r, i) => (
                <li key={i}>
                  <span className="hist-date">{dateFmt.format(r.ts)}</span>
                  <span className="hist-mode">{MODE_LABEL[r.type]} · {r.difficulty === "hard" ? "schwer" : "einfach"}</span>
                  <span className="hist-score">{r.score}/{r.total}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  // --- Done ---
  if (phase === "done") {
    const wrong = answers.filter((a) => !a.correct);
    return (
      <div className="quiz quiz-done">
        <h1>Ergebnis</h1>
        <p className="score-big">{score} / {questions.length}</p>
        {wrong.length === 0 ? (
          <p>Alles richtig — stark! 🎉</p>
        ) : (
          <div className="fehleranalyse">
            <h2>Fehleranalyse</h2>
            <ul>
              {wrong.map((a, i) => (
                <li key={i}>
                  <span className="fa-country">{a.q.subjectName}</span>
                  <span className="muted">
                    deine Antwort: {a.chosen} · richtig: {a.q.options.find((o) => o.correct)?.label}
                  </span>
                  <button className="link" onClick={() => onOpenCountry(a.q.subjectId)}>→ Steckbrief</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button className="btn-primary" onClick={() => setPhase("setup")}>Nochmal</button>
      </div>
    );
  }

  // --- Playing ---
  if (!q) {
    return <div className="quiz"><p className="empty">Keine Fragen verfügbar.</p></div>;
  }
  const answered = chosen != null;
  return (
    <div className="quiz quiz-play">
      <div className="quiz-progress">
        <span>Frage {index + 1} / {questions.length}</span>
        <span>Punkte: {score}</span>
      </div>
      {q.flagEmoji ? <div className="quiz-flag" aria-label="Flagge">{q.flagEmoji}</div> : null}
      <h2 className="quiz-prompt">{q.prompt}</h2>
      <div className="options">
        {q.options.map((o) => {
          let cls = "option";
          if (answered) {
            if (o.correct) cls += " correct";
            else if (o.label === chosen) cls += " wrong";
            else cls += " dim";
          }
          return (
            <button key={o.label} className={cls} disabled={answered} onClick={() => choose(o.label)}>
              {o.label}
            </button>
          );
        })}
      </div>
      {answered ? (
        <button className="btn-primary" onClick={next}>
          {index + 1 >= questions.length ? "Auswertung" : "Weiter"}
        </button>
      ) : null}
    </div>
  );
}
