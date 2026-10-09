import { describe, expect, it } from 'vitest';
import { splitSentences } from '@/lib/speech';

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
