// Funciones puras sobre preguntas: mezclar, armar rondas, agrupar categorías y elegir la pregunta del día.
// No dependen de React ni del navegador, así que se testean directo (ver src/lib/__tests__).

import type { Category, Question } from '@/types';

export type RandomFn = () => number;

/** Fisher-Yates shuffle. Returns a new array; does not mutate the original. */
export function shuffle<T>(items: readonly T[], random: RandomFn = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Shuffles a question's options (2 to 4) and updates `correctIndex`
 * so the right answer is not always in the same position.
 */
export function shuffleOptions(question: Question, random: RandomFn = Math.random): Question {
  const order = shuffle(question.options.map((_, index) => index), random);
  return {
    ...question,
    options: order.map(index => question.options[index]),
    correctIndex: order.indexOf(question.correctIndex),
  };
}

/**
 * Builds a single-player round.
 * With `history`, questions the player has not answered yet come first, then the ones they got
 * wrong last time, then the rest, so a category is covered before anything repeats.
 */
export function buildRound(
  pool: readonly Question[],
  size: number,
  random: RandomFn = Math.random,
  history?: { seen: ReadonlySet<string>; missed: ReadonlySet<string> },
): Question[] {
  const ordered = history
    ? [
        ...shuffle(pool.filter(q => !history.seen.has(q.id)), random),
        ...shuffle(pool.filter(q => history.seen.has(q.id) && history.missed.has(q.id)), random),
        ...shuffle(pool.filter(q => history.seen.has(q.id) && !history.missed.has(q.id)), random),
      ]
    : shuffle(pool, random);
  return ordered
    .slice(0, size)
    .map(q => shuffleOptions(q, random));
}

/** Groups questions into categories with their counts and difficulties. */
export function buildCategories(questions: readonly Question[]): Category[] {
  const map = new Map<string, Category>();
  for (const q of questions) {
    const existing = map.get(q.category);
    if (existing) {
      existing.count++;
      existing.difficulties.push(q.difficulty);
    } else {
      map.set(q.category, {
        id: q.category,
        label: q.category_label,
        count: 1,
        difficulties: [q.difficulty],
      });
    }
  }
  return Array.from(map.values());
}

/** Most frequent difficulty in the list; `'medium'` when empty. */
export function getDominantDifficulty(difficulties: readonly string[]): string {
  const counts: Record<string, number> = {};
  for (const d of difficulties) counts[d] = (counts[d] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'medium';
}

/** Small, stable string hash (FNV-1a) used to pick the daily question and the scene of a question. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Picks the question of the day: everyone sees the same question on the same date.
 * Returns `null` when there is nothing to pick from.
 */
export function pickDailyQuestion(questions: readonly Question[], dateKey: string): Question | null {
  if (questions.length === 0) return null;
  const sorted = [...questions].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[hashString(`${dateKey}:all`) % sorted.length];
}
