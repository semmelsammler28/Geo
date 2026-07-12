// Ergebnis-Historie der Quiz-Läufe (Briefing 4.7: Verlauf über Zeit sichtbar,
// nicht nur bester Streak). Lokal persistiert.

import type { Difficulty, QuizType } from "./quiz-engine";

export interface QuizResult {
  ts: number;
  type: QuizType;
  difficulty: Difficulty;
  score: number;
  total: number;
}

const STORAGE_KEY = "geo.quizhistory.v1";
const CAP = 50;

function load(): QuizResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QuizResult[]) : [];
  } catch {
    return [];
  }
}

let results = load();

export function addResult(r: Omit<QuizResult, "ts">, ts: number = Date.now()): void {
  results = [{ ...r, ts }, ...results].slice(0, CAP);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  } catch {
    /* localStorage nicht verfügbar */
  }
}

export function getResults(): QuizResult[] {
  return results;
}

/** Beste Trefferquote (0..1) für einen Typ, oder null wenn keine Läufe. */
export function bestRate(type: QuizType): number | null {
  const rel = results.filter((r) => r.type === type && r.total > 0);
  if (!rel.length) return null;
  return Math.max(...rel.map((r) => r.score / r.total));
}
