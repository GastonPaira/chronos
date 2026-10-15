import { describe, expect, it } from 'vitest';
import { spanAtFraction, splitByRange, splitSentences, splitSpans } from '@/lib/speech';

describe('splitSentences', () => {
  it('splits a paragraph into sentences', () => {
    expect(splitSentences('The divers stopped. One came back up! Was he scared? Yes.')).toEqual([
      'The divers stopped.', 'One came back up!', 'Was he scared?', 'Yes.',
    ]);
  });

  it('keeps text without final punctuation', () => {
    expect(splitSentences('A calculator of the sky')).toEqual(['A calculator of the sky']);
  });

  it('breaks very long sentences at commas', () => {
    const long = 'First part of the sentence, second part of the sentence, third part of the sentence.';
    const parts = splitSentences(long, 40);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join(' ')).toBe(long);
    expect(parts.every(p => p.length <= 40)).toBe(true);
  });
});

describe('splitSpans', () => {
  it('points at each sentence inside the original text', () => {
    const text = 'The divers stopped.  One came back up! Yes.';
    const spans = splitSpans(text);
    expect(spans.map(s => text.slice(s.start, s.end))).toEqual(['The divers stopped.', 'One came back up!', 'Yes.']);
  });

  it('gives the same pieces as splitSentences, also for long sentences', () => {
    const long = 'First part of the sentence, second part of the sentence, third part of the sentence. Short one.';
    expect(splitSpans(long, 40).map(s => long.slice(s.start, s.end))).toEqual(splitSentences(long, 40));
  });
});

describe('spanAtFraction', () => {
  const spans = [{ start: 0, end: 10 }, { start: 11, end: 31 }, { start: 32, end: 42 }];

  it('moves through the sentences as the audio plays, weighted by length', () => {
    expect(spanAtFraction(spans, 0)).toBe(0);
    expect(spanAtFraction(spans, 0.2)).toBe(0);
    expect(spanAtFraction(spans, 0.3)).toBe(1);
    expect(spanAtFraction(spans, 0.6)).toBe(1);
    expect(spanAtFraction(spans, 0.9)).toBe(2);
    expect(spanAtFraction(spans, 1)).toBe(2);
  });

  it('returns -1 when there is nothing to read', () => {
    expect(spanAtFraction([], 0.5)).toBe(-1);
  });
});

describe('splitByRange', () => {
  it('leaves text alone when the range does not touch it', () => {
    expect(splitByRange('hello', 0, { start: 10, end: 20 })).toEqual([{ text: 'hello', inside: false }]);
    expect(splitByRange('hello', 0, null)).toEqual([{ text: 'hello', inside: false }]);
  });

  it('cuts the text at the edges of the range, using the segment offset', () => {
    expect(splitByRange('hello world', 5, { start: 8, end: 12 })).toEqual([
      { text: 'hel', inside: false },
      { text: 'lo w', inside: true },
      { text: 'orld', inside: false },
    ]);
  });

  it('marks the whole text when it is inside the range', () => {
    expect(splitByRange('abc', 3, { start: 0, end: 20 })).toEqual([{ text: 'abc', inside: true }]);
  });
});
