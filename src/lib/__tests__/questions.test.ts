import { describe, expect, it } from 'vitest';
import type { Question } from '@/types';
import { buildRound, pickDailyQuestion, shuffleOptions } from '@/lib/questions';

/** Deterministic pseudo-random generator so shuffles are reproducible. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const ls = (text: string) => ({ en: text, es: text });

function question(id: string, story?: string, optionCount = 3): Question {
  return {
    id,
    category: 'ancient-greece',
    category_label: ls('Ancient Greece'),
    difficulty: 'easy',
    question: ls(`Question ${id}`),
    options: Array.from({ length: optionCount }, (_, i) => ls(`${id}-option-${i}`)),
    correctIndex: 0,
    explanation: ls(''),
    meanwhile: ls(''),
    reflection: ls(''),
    story,
  };
}

describe('shuffleOptions', () => {
  it('keeps pointing at the right answer after shuffling 2 to 4 options', () => {
    for (const count of [2, 3, 4]) {
      for (let seed = 1; seed <= 20; seed++) {
        const original = question('q', undefined, count);
        const shuffled = shuffleOptions(original, seeded(seed));
        expect(shuffled.options).toHaveLength(count);
        expect(shuffled.options[shuffled.correctIndex]).toEqual(original.options[0]);
      }
    }
  });
});

describe('buildRound', () => {
  const pool = [
    question('gr-001'), question('gr-002'), question('gr-003'),
    question('gr-006', 'antikythera'), question('gr-007', 'antikythera'),
  ];

  it('opens the round with the story questions when a story is given', () => {
    const round = buildRound(pool, 10, 'antikythera', seeded(3));
    expect(round.slice(0, 2).every(q => q.story === 'antikythera')).toBe(true);
    expect(round).toHaveLength(5);
  });

  it('caps the round size and never repeats a question', () => {
    const round = buildRound(pool, 3, undefined, seeded(7));
    expect(round).toHaveLength(3);
    expect(new Set(round.map(q => q.id)).size).toBe(3);
  });
});

describe('pickDailyQuestion', () => {
  const pool = [question('a'), question('b'), question('c', 'antikythera'), question('d', 'antikythera')];

  it('gives everyone the same question on the same date', () => {
    const first = pickDailyQuestion(pool, '2026-10-09');
    const again = pickDailyQuestion([...pool].reverse(), '2026-10-09');
    expect(again?.id).toBe(first?.id);
  });

  it('only picks from the story inside an article', () => {
    for (const day of ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12']) {
      expect(pickDailyQuestion(pool, day, 'antikythera')?.story).toBe('antikythera');
    }
  });

  it('returns null when the story has no questions', () => {
    expect(pickDailyQuestion(pool, '2026-10-09', 'unknown')).toBeNull();
  });
});
