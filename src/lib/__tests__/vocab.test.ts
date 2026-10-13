import { describe, expect, it } from 'vitest';
import type { Question } from '@/types';
import questionsData from '@/data/questions';
import {
  BLANK,
  blankOut,
  buildReview,
  collectVocab,
  containsTerm,
  questionTexts,
  splitByVocab,
} from '@/lib/vocab';
import { applyReview, isLearned, learnedCount, wordKey, type WordStore } from '@/lib/words';

/** Deterministic pseudo-random generator so shuffles are reproducible. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const ls = (text: string) => ({ en: text, es: text });

function question(id: string, explanation: string, vocab: { term: string; es: string }[]): Question {
  return {
    id,
    category: 'ancient-greece',
    category_label: ls('Ancient Greece'),
    difficulty: 'easy',
    question: ls('A question without glossary words?'),
    options: [ls('a'), ls('b')],
    correctIndex: 0,
    explanation: ls(explanation),
    meanwhile: ls(''),
    reflection: ls(''),
    vocab,
  };
}

const POOL: Question[] = [
  question('q1', 'The divers found a shipwreck. They were terrified.', [
    { term: 'shipwreck', es: 'naufragio' },
    { term: 'terrified', es: 'aterrado' },
  ]),
  question('q2', 'A crank turned the bronze gears. Gears moved dials.', [
    { term: 'gears', es: 'engranajes' },
    { term: 'crank', es: 'manivela' },
  ]),
  question('q3', 'Scholars translated the books. The pin slid in a slot.', [
    { term: 'translated', es: 'tradujeron' },
    { term: 'slot', es: 'ranura' },
  ]),
];

describe('splitByVocab', () => {
  it('marks glossary words and keeps the original text and casing', () => {
    const segments = splitByVocab('Gears turn. The crank moves gears.', [
      { term: 'gears', es: 'engranajes' },
      { term: 'crank', es: 'manivela' },
    ]);
    expect(segments.map(s => s.text).join('')).toBe('Gears turn. The crank moves gears.');
    expect(segments.filter(s => s.entry).map(s => s.text)).toEqual(['Gears', 'crank', 'gears']);
  });

  it('matches whole words only', () => {
    const segments = splitByVocab('The pinned map had a spinning pin.', [{ term: 'pin', es: 'clavija' }]);
    expect(segments.filter(s => s.entry).map(s => s.text)).toEqual(['pin']);
  });

  it('matches phrases and hyphenated terms', () => {
    const vocab = [
      { term: 'ahead of its time', es: 'adelantado' },
      { term: 'off-center', es: 'descentrado' },
    ];
    const segments = splitByVocab('Far ahead of its time, two off-center gears.', vocab);
    expect(segments.filter(s => s.entry).map(s => s.text)).toEqual(['ahead of its time', 'off-center']);
  });

  it('returns the whole text when there is no glossary', () => {
    expect(splitByVocab('Just text', undefined)).toEqual([{ text: 'Just text' }]);
    expect(splitByVocab('Just text', [])).toEqual([{ text: 'Just text' }]);
  });
});

describe('collectVocab', () => {
  it('returns each word once with the sentence where it appears', () => {
    const words = collectVocab(POOL);
    expect(words.map(w => w.term)).toEqual(['shipwreck', 'terrified', 'gears', 'crank', 'translated', 'slot']);
    expect(words.find(w => w.term === 'terrified')?.sentence).toBe('They were terrified.');
  });
});

describe('blankOut', () => {
  it('replaces the word, keeping the characters around it', () => {
    expect(blankOut('A crank, then the Crank.', 'crank')).toBe(`A ${BLANK}, then the ${BLANK}.`);
  });
});

describe('buildReview', () => {
  const empty: WordStore = {};

  it('builds cards with 3 options and a valid correct answer', () => {
    const items = buildReview({
      roundQuestions: POOL,
      allQuestions: POOL,
      touched: new Set(),
      store: empty,
      random: seeded(7),
    });
    expect(items.length).toBe(5);
    for (const item of items) {
      expect(item.options.length).toBe(3);
      expect(new Set(item.options).size).toBe(3);
      const correct = item.kind === 'meaning' ? item.es : item.term;
      expect(item.options[item.correctIndex]).toBe(correct);
    }
  });

  it('alternates meaning and fill-the-blank cards, and blanks the word in the latter', () => {
    const items = buildReview({ roundQuestions: POOL, allQuestions: POOL, touched: new Set(), store: empty, random: seeded(3) });
    expect(items.map(i => i.kind)).toEqual(['meaning', 'cloze', 'meaning', 'cloze', 'meaning']);
    for (const item of items.filter(i => i.kind === 'cloze')) {
      expect(item.sentence).toContain(BLANK);
      expect(containsTerm(item.sentence, item.term)).toBe(false);
    }
  });

  it('puts tapped words first and leaves out learned ones', () => {
    const store: WordStore = applyReview(empty, [
      { term: 'crank', es: 'manivela', correct: true },
    ], '2026-10-13').store;
    const twice = applyReview(store, [{ term: 'crank', es: 'manivela', correct: true }], '2026-10-14').store;
    expect(isLearned(twice['crank'])).toBe(true);

    const items = buildReview({
      roundQuestions: POOL,
      allQuestions: POOL,
      touched: new Set([wordKey('slot')]),
      store: twice,
      size: 2,
      random: seeded(1),
    });
    expect(items.map(i => i.term)).toContain('slot');
    expect(items.map(i => i.term)).not.toContain('crank');
  });

  it('brings back words missed in earlier rounds even if they are not in this round', () => {
    const missed = applyReview(empty, [{ term: 'slot', es: 'ranura', correct: false }], '2026-10-13').store;
    const items = buildReview({
      roundQuestions: [POOL[0]],
      allQuestions: POOL,
      touched: new Set(),
      store: missed,
      size: 5,
      random: seeded(2),
    });
    expect(items.map(i => i.term)).toContain('slot');
  });

  it('avoids two cards from the same sentence while other sentences are available', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const items = buildReview({ roundQuestions: POOL, allQuestions: POOL, touched: new Set(), store: empty, size: 3, random: seeded(seed) });
      const bases = items.map(i => collectVocab(POOL).find(w => w.term === i.term)!.sentence);
      expect(new Set(bases).size, `seed ${seed}`).toBe(3);
    }
  });

  it('returns nothing when the glossary is too small to build options', () => {
    expect(buildReview({ roundQuestions: [POOL[0]], allQuestions: [POOL[0]], touched: new Set(), store: empty })).toEqual([]);
  });

  it('works with the real questions', () => {
    const all = questionsData as Question[];
    const items = buildReview({ roundQuestions: all, allQuestions: all, touched: new Set(), store: empty });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item.options[item.correctIndex]).toBeTruthy();
  });
});

describe('word progress', () => {
  it('counts a word as learned after two correct answers in a row, and resets on a miss', () => {
    let { store } = applyReview({}, [{ term: 'Gears', es: 'engranajes', correct: true }], '2026-10-13');
    expect(learnedCount(store)).toBe(0);

    const second = applyReview(store, [{ term: 'gears', es: 'engranajes', correct: true }], '2026-10-14');
    expect(second.newlyLearned).toBe(1);
    expect(learnedCount(second.store)).toBe(1);

    const third = applyReview(second.store, [{ term: 'gears', es: 'engranajes', correct: true }], '2026-10-15');
    expect(third.newlyLearned).toBe(0);

    store = applyReview(third.store, [{ term: 'gears', es: 'engranajes', correct: false }], '2026-10-16').store;
    expect(store['gears'].streak).toBe(0);
    expect(store['gears'].seen).toBe(4);
    expect(learnedCount(store)).toBe(0);
  });
});

describe('real glossary', () => {
  it('every glossary term appears in the question texts and has a translation', () => {
    for (const q of (questionsData as Question[]).filter(q => q.vocab)) {
      expect(q.vocab!.length, q.id).toBeGreaterThanOrEqual(3);
      expect(q.vocab!.length, q.id).toBeLessThanOrEqual(5);
      for (const { term, es } of q.vocab!) {
        expect(es.trim(), `${q.id}: ${term}`).not.toBe('');
        expect(
          questionTexts(q).some(text => containsTerm(text, term)),
          `${q.id}: "${term}" not found in the question texts`,
        ).toBe(true);
      }
    }
  });
});
