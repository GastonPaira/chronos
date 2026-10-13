import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import type { Question } from '@/types';
import questionsData from '@/data/questions';
import { CATEGORIES, ERAS, STORIES } from '@/data/catalog';

const questions = questionsData as Question[];
const publicDir = path.resolve(process.cwd(), 'public');

describe('content catalog', () => {
  it('every question belongs to a category in the catalog and in an era', () => {
    const inEras = new Set(ERAS.flatMap(era => era.categoryIds));
    for (const q of questions) {
      expect(CATEGORIES[q.category], q.id).toBeDefined();
      expect(inEras.has(q.category), q.id).toBe(true);
    }
  });

  it('question ids are unique', () => {
    expect(new Set(questions.map(q => q.id)).size).toBe(questions.length);
  });

  it('every question has 2 to 4 options and a valid correct answer', () => {
    for (const q of questions) {
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(2);
      expect(q.options.length, q.id).toBeLessThanOrEqual(4);
      expect(q.correctIndex, q.id).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex, q.id).toBeLessThan(q.options.length);
    }
  });

  it('every category has at least 30 questions, so rounds do not repeat', () => {
    for (const id of Object.keys(CATEGORIES)) {
      expect(questions.filter(q => q.category === id).length, id).toBeGreaterThanOrEqual(30);
    }
  });

  it('every playable era has categories, and every era in the catalog is playable', () => {
    for (const era of ERAS) expect(era.categoryIds.length, era.id).toBeGreaterThan(0);
  });

  it('every question has an English level, 3 options and a glossary of 3 to 5 words', () => {
    for (const q of questions) {
      expect(q.level, q.id).toBeDefined();
      expect(q.options.length, q.id).toBe(3);
      expect(q.vocab?.length ?? 0, q.id).toBeGreaterThanOrEqual(3);
      expect(q.vocab!.length, q.id).toBeLessThanOrEqual(5);
    }
  });

  it('every question is fully translated', () => {
    for (const q of questions) {
      const texts = [q.question, q.explanation, q.meanwhile, q.reflection, ...q.options];
      for (const text of texts) {
        expect(text.en.trim(), q.id).not.toBe('');
        expect(text.es.trim(), q.id).not.toBe('');
      }
    }
  });

  it('every story referenced by a question exists', () => {
    for (const q of questions.filter(q => q.story)) {
      expect(STORIES[q.story!], q.id).toBeDefined();
    }
  });

  it('every era and category image exists in public/', () => {
    const images = [...ERAS.map(e => e.image), ...Object.values(CATEGORIES).map(c => c.image)];
    for (const image of images) {
      expect(fs.existsSync(path.join(publicDir, image)), image).toBe(true);
    }
  });
});
