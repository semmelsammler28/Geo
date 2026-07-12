import type { Country } from "../types/country";
import { displayName } from "../data/countries";
import { area, num } from "../lib/format";
import {
  flagClusterIds,
  magnitudePool,
  pickN,
  sameRegionPool,
  shuffle,
  TRANSCONTINENTAL,
  type Rng,
} from "./similarity";

export type QuizType = "capitals" | "flags" | "continents" | "population" | "area" | "mixed";
export type Difficulty = "easy" | "hard";

/** Optionale Gewichtung der Fragenauswahl (adaptiv, aus der Mastery-Schicht). */
export type WeightFn = (topic: "capitals" | "flags" | "continents", id: string) => number;

function weightedPick<T extends { id: string }>(
  pool: T[],
  rng: Rng,
  weightOf: (item: T) => number
): T {
  const weights = pool.map((x) => Math.max(0, weightOf(x)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return pool[Math.floor(rng() * pool.length)];
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export interface QuizOption {
  label: string;
  correct: boolean;
}

export interface Question {
  type: Exclude<QuizType, "mixed">;
  prompt: string;
  /** Für den Flaggen-Modus: Emoji-Flagge, die gezeigt wird. */
  flagEmoji?: string;
  options: QuizOption[];
  /** Land, um das es geht — für die Fehleranalyse (Sprung zum Steckbrief). */
  subjectId: string;
  subjectName: string;
}

const CONTINENTS = [
  "Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica",
];
const CONTINENT_DE: Record<string, string> = {
  Africa: "Afrika", Asia: "Asien", Europe: "Europa",
  "North America": "Nordamerika", "South America": "Südamerika",
  Oceania: "Ozeanien", Antarctica: "Antarktis",
};

function primaryCapital(c: Country) {
  return c.capitals.find((k) => k.isPrimaryForQuiz) ?? c.capitals[0];
}

/** Land eignet sich für den Hauptstadt-Modus (Hauptstadt vorhanden und nicht umstritten). */
function capitalQuizzable(c: Country): boolean {
  const cap = primaryCapital(c);
  if (!cap || cap.disputed) return false;
  return !c.disputes?.some((d) => d.field === "capitals");
}

function toOptions(correct: string, distractors: string[], rng: Rng): QuizOption[] {
  const opts: QuizOption[] = [
    { label: correct, correct: true },
    ...distractors.map((label) => ({ label, correct: false })),
  ];
  return shuffle(opts, rng);
}

/** Bis zu n verschiedene Label aus Kandidaten-Ländern, ungleich dem Korrektwert. */
function distinctLabels(
  candidates: Country[],
  toLabel: (c: Country) => string,
  correctLabel: string,
  n: number,
  rng: Rng
): string[] {
  const seen = new Set([correctLabel]);
  const out: string[] = [];
  for (const c of shuffle(candidates, rng)) {
    const l = toLabel(c);
    if (!seen.has(l)) {
      seen.add(l);
      out.push(l);
      if (out.length === n) break;
    }
  }
  return out;
}

function capitalsQuestion(all: Country[], diff: Difficulty, rng: Rng, weightFor?: WeightFn): Question | null {
  const pool = all.filter(capitalQuizzable);
  if (pool.length < 4) return null;
  const subject = weightedPick(pool, rng, (c) => (weightFor ? weightFor("capitals", c.id) : 1));
  const correct = primaryCapital(subject).name;

  // Hard: Distraktoren aus derselben Region (verwechselbarer). Easy: irgendwoher.
  const source = diff === "hard" ? sameRegionPool(subject, pool) : pool;
  let labels = distinctLabels(source.filter(capitalQuizzable), (c) => primaryCapital(c).name, correct, 3, rng);
  if (labels.length < 3) {
    labels = distinctLabels(pool, (c) => primaryCapital(c).name, correct, 3, rng);
  }
  if (labels.length < 3) return null;

  return {
    type: "capitals",
    prompt: `Wie heißt die Hauptstadt von ${displayName(subject)}?`,
    options: toOptions(correct, labels, rng),
    subjectId: subject.id,
    subjectName: displayName(subject),
  };
}

function flagsQuestion(all: Country[], diff: Difficulty, rng: Rng, weightFor?: WeightFn): Question | null {
  const pool = all.filter((c) => c.flag.emoji);
  if (pool.length < 4) return null;
  const subject = weightedPick(pool, rng, (c) => (weightFor ? weightFor("flags", c.id) : 1));
  const correct = displayName(subject);

  let candidates: Country[];
  if (diff === "hard") {
    const clusterIds = new Set(flagClusterIds(subject.id));
    candidates = pool.filter((c) => clusterIds.has(c.id));
    if (candidates.length < 3) {
      // Cluster zu klein -> mit demselben Kontinent auffüllen.
      candidates = candidates.concat(
        pool.filter((c) => c.geography.continent === subject.geography.continent && c.id !== subject.id)
      );
    }
  } else {
    candidates = pool.filter((c) => c.id !== subject.id);
  }

  const labels = distinctLabels(candidates, displayName, correct, 3, rng);
  if (labels.length < 3) return null;

  return {
    type: "flags",
    prompt: "Zu welchem Land gehört diese Flagge?",
    flagEmoji: subject.flag.emoji,
    options: toOptions(correct, labels, rng),
    subjectId: subject.id,
    subjectName: correct,
  };
}

function continentsQuestion(all: Country[], diff: Difficulty, rng: Rng, weightFor?: WeightFn): Question | null {
  // Hard: transkontinentale Grenzfälle bevorzugen (aber nicht ausschließlich,
  // sonst reichen die wenigen Fälle nicht für ein ganzes Quiz).
  let pool = all;
  if (diff === "hard" && rng() < 0.6) {
    const tricky = all.filter((c) => TRANSCONTINENTAL.includes(c.id));
    if (tricky.length) pool = tricky;
  }
  const subject = weightedPick(pool, rng, (c) => (weightFor ? weightFor("continents", c.id) : 1));
  const correct = CONTINENT_DE[subject.geography.continent] ?? subject.geography.continent;
  const others = CONTINENTS.filter((k) => k !== subject.geography.continent).map((k) => CONTINENT_DE[k]);
  const distractors = pickN(others, 3, rng);
  if (distractors.length < 3) return null;

  return {
    type: "continents",
    prompt: `Auf welchem Kontinent liegt ${displayName(subject)}?`,
    options: toOptions(correct, distractors, rng),
    subjectId: subject.id,
    subjectName: displayName(subject),
  };
}

function magnitudeQuestion(
  all: Country[],
  diff: Difficulty,
  rng: Rng,
  cfg: { type: "population" | "area"; get: (c: Country) => number | undefined; fmt: (v: number) => string; label: string }
): Question | null {
  const pool = all.filter((c) => cfg.get(c) != null);
  if (pool.length < 4) return null;
  const subject = pool[Math.floor(rng() * pool.length)];
  const refValue = cfg.get(subject)!;
  const correct = cfg.fmt(refValue);

  // Hard: ähnliche Größenordnung (0,5–2×). Easy: breiter Pool (meist klar verschieden).
  const source =
    diff === "hard" ? magnitudePool(refValue, pool, cfg.get, subject.id, 2) : pool.filter((c) => c.id !== subject.id);
  let labels = distinctLabels(source, (c) => cfg.fmt(cfg.get(c)!), correct, 3, rng);
  if (labels.length < 3) {
    labels = distinctLabels(pool.filter((c) => c.id !== subject.id), (c) => cfg.fmt(cfg.get(c)!), correct, 3, rng);
  }
  if (labels.length < 3) return null;

  return {
    type: cfg.type,
    prompt: `${cfg.label} von ${displayName(subject)}?`,
    options: toOptions(correct, labels, rng),
    subjectId: subject.id,
    subjectName: displayName(subject),
  };
}

type Generator = (all: Country[], d: Difficulty, r: Rng, w?: WeightFn) => Question | null;

const GENERATORS: Record<Exclude<QuizType, "mixed">, Generator> = {
  capitals: capitalsQuestion,
  flags: flagsQuestion,
  continents: continentsQuestion,
  population: (all, d, r) =>
    magnitudeQuestion(all, d, r, { type: "population", get: (c) => c.society.population?.value, fmt: num, label: "Wie viele Einwohner (ungefähr) hat" }),
  area: (all, d, r) =>
    magnitudeQuestion(all, d, r, { type: "area", get: (c) => c.geography.area?.value, fmt: area, label: "Wie groß ist die Fläche" }),
};

const ALL_TYPES = Object.keys(GENERATORS) as Exclude<QuizType, "mixed">[];

export function generateQuestion(
  all: Country[],
  type: QuizType,
  diff: Difficulty,
  rng: Rng = Math.random,
  weightFor?: WeightFn
): Question | null {
  const chosen = type === "mixed" ? ALL_TYPES[Math.floor(rng() * ALL_TYPES.length)] : type;
  return GENERATORS[chosen](all, diff, rng, weightFor);
}

/** Erzeugt count Fragen; überspringt (seltene) Fehlschläge und dedupt gleiche Subjekte grob. */
export function generateQuiz(
  all: Country[],
  cfg: { type: QuizType; difficulty: Difficulty; count: number },
  rng: Rng = Math.random,
  weightFor?: WeightFn
): Question[] {
  const questions: Question[] = [];
  const recentSubjects = new Set<string>();
  let guard = 0;
  while (questions.length < cfg.count && guard < cfg.count * 20) {
    guard++;
    const q = generateQuestion(all, cfg.type, cfg.difficulty, rng, weightFor);
    if (!q) continue;
    const key = `${q.type}:${q.subjectId}`;
    if (recentSubjects.has(key)) continue;
    recentSubjects.add(key);
    questions.push(q);
  }
  return questions;
}
