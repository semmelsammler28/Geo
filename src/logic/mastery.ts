// Geteilte Mastery-/Spaced-Repetition-Schicht (Briefing 4.2 + 4.7).
// Pro (Thema, Land) ein SRS-Zustand, persistiert in localStorage. Karteikarten
// UND Quiz schreiben in denselben Speicher — so wird schwaches Wissen in beiden
// Modi häufiger geübt, gemeistertes seltener.

export type Topic = "capitals" | "flags" | "continents";
export type Grade = "again" | "good" | "easy";

export interface CardState {
  ease: number;
  interval: number; // Tage
  due: number; // Zeitstempel (ms)
  reps: number;
  lapses: number;
  seen: boolean;
}

const DAY = 24 * 60 * 60 * 1000;
const STORAGE_KEY = "geo.mastery.v1";
const MASTERED_INTERVAL = 21; // Tage bis "gemeistert"

type Store = Record<string, CardState>;

function load(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function save(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* localStorage nicht verfügbar — dann eben nur In-Memory für die Sitzung */
  }
}

let store: Store = load();

const key = (topic: Topic, id: string) => `${topic}:${id}`;

export function getState(topic: Topic, id: string): CardState | undefined {
  return store[key(topic, id)];
}

function fresh(now: number): CardState {
  return { ease: 2.5, interval: 0, due: now, reps: 0, lapses: 0, seen: false };
}

/** Bewertet eine Karte und aktualisiert den Zeitplan (SM-2-artig). */
export function grade(topic: Topic, id: string, g: Grade, now: number = Date.now()): CardState {
  const s = { ...(store[key(topic, id)] ?? fresh(now)) };

  if (g === "again") {
    s.reps = 0;
    s.lapses += 1;
    s.ease = Math.max(1.3, s.ease - 0.2);
    s.interval = 0;
    s.due = now; // heute erneut fällig
  } else {
    if (g === "easy") s.ease += 0.15;
    if (s.reps === 0) s.interval = g === "easy" ? 4 : 1;
    else if (s.reps === 1) s.interval = g === "easy" ? 8 : 6;
    else s.interval = Math.round(s.interval * s.ease * (g === "easy" ? 1.3 : 1));
    s.reps += 1;
    s.due = now + s.interval * DAY;
  }
  s.seen = true;

  store[key(topic, id)] = s;
  save(store);
  return s;
}

export interface TopicStats {
  total: number;
  seen: number;
  due: number;
  mastered: number;
}

export function stats(topic: Topic, allIds: string[], now: number = Date.now()): TopicStats {
  let seen = 0, due = 0, mastered = 0;
  for (const id of allIds) {
    const s = store[key(topic, id)];
    if (!s || !s.seen) continue;
    seen++;
    if (s.due <= now) due++;
    if (s.interval >= MASTERED_INTERVAL) mastered++;
  }
  return { total: allIds.length, seen, due, mastered };
}

/**
 * Baut eine Lernsitzung: fällige (gesehene) Karten zuerst, dann bis maxNew neue.
 * Gesamtgröße auf maxTotal begrenzt.
 */
export function buildSession(
  topic: Topic,
  allIds: string[],
  { maxNew = 10, maxTotal = 20 }: { maxNew?: number; maxTotal?: number } = {},
  now: number = Date.now()
): string[] {
  const dueSeen: string[] = [];
  const fresh: string[] = [];
  for (const id of allIds) {
    const s = store[key(topic, id)];
    if (s && s.seen) {
      if (s.due <= now) dueSeen.push(id);
    } else {
      fresh.push(id);
    }
  }
  shuffleInPlace(dueSeen);
  shuffleInPlace(fresh);
  return [...dueSeen, ...fresh.slice(0, maxNew)].slice(0, maxTotal);
}

/** Gewicht für die adaptive Quiz-Auswahl: schwaches/ungesehenes Wissen höher. */
export function weight(topic: Topic, id: string, now: number = Date.now()): number {
  const s = store[key(topic, id)];
  if (!s || !s.seen) return 3;
  if (s.interval >= MASTERED_INTERVAL) return 0.15;
  if (s.due <= now) return s.lapses > 0 ? 2.5 : 1.6;
  return 0.6;
}

function shuffleInPlace<T>(a: T[]): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

/** Nur für Tests/Debug: Speicher leeren. */
export function _reset(): void {
  store = {};
  save(store);
}
