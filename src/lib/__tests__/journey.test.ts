import { describe, expect, it } from 'vitest';
import type { EraDef } from '@/data/catalog';
import { makeEmptyProgress } from '@/lib/progress';
import { continueTarget, currentStop, eraEnd, planTrip, totalYears, yearsExplored } from '@/lib/journey';

const era = (id: string, categoryIds: string[], startYear: number, endYear: number | null): EraDef => ({
  id, icon: '', image: '', categoryIds, startYear, endYear,
});

const ERAS = [era('old', ['a', 'b'], -1000, 0), era('new', ['c'], 0, null)];
const TOTALS = { a: 10, b: 10, c: 20 };
const NOW = 2000;

const withSeen = (seen: Record<string, number>) => ({
  ...makeEmptyProgress('2026-10-15'),
  seen: Object.fromEntries(Object.entries(seen).map(([id, n]) => [id, Array.from({ length: n }, (_, i) => `${id}-${i}`)])),
});

describe('planTrip', () => {
  it('starts with nothing traveled', () => {
    const trip = planTrip(ERAS, null, TOTALS, NOW);
    expect(trip.map(s => s.fraction)).toEqual([0, 0]);
    expect(trip.map(s => s.years)).toEqual([1000, 2000]);
    expect(yearsExplored(trip)).toBe(0);
    expect(totalYears(trip)).toBe(3000);
  });

  it('counts the questions seen across the categories of an era', () => {
    const trip = planTrip(ERAS, withSeen({ a: 10, b: 5, c: 20 }), TOTALS, NOW);
    expect(trip[0]).toMatchObject({ seen: 15, total: 20, fraction: 0.75, complete: false });
    expect(trip[1]).toMatchObject({ seen: 20, total: 20, fraction: 1, complete: true });
  });

  it('never counts more than a category has', () => {
    const trip = planTrip(ERAS, withSeen({ a: 99 }), TOTALS, NOW);
    expect(trip[0].seen).toBe(10);
  });

  it('turns questions into years of history', () => {
    const trip = planTrip(ERAS, withSeen({ a: 10, c: 10 }), TOTALS, NOW);
    expect(yearsExplored(trip)).toBe(500 + 1000);
  });
});

describe('eraEnd', () => {
  it('uses today for the era that has no end', () => {
    expect(eraEnd(ERAS[1], NOW)).toBe(2000);
    expect(eraEnd(ERAS[0], NOW)).toBe(0);
  });
});

describe('currentStop', () => {
  it('points at the first era that is not finished', () => {
    expect(currentStop(planTrip(ERAS, null, TOTALS, NOW))).toBe(0);
    expect(currentStop(planTrip(ERAS, withSeen({ a: 10, b: 10 }), TOTALS, NOW))).toBe(1);
  });

  it('stays on the last era when everything is finished', () => {
    expect(currentStop(planTrip(ERAS, withSeen({ a: 10, b: 10, c: 20 }), TOTALS, NOW))).toBe(1);
  });
});

describe('continueTarget', () => {
  const playedLast = (lastCategory: string, seen: Record<string, number>) => ({ ...withSeen(seen), lastCategory });

  it('offers nothing before the first answer', () => {
    expect(continueTarget(ERAS, null, TOTALS)).toBeNull();
    expect(continueTarget(ERAS, withSeen({ a: 3 }), TOTALS)).toBeNull();
  });

  it('continues in the category played last while it has questions left', () => {
    expect(continueTarget(ERAS, playedLast('b', { b: 4 }), TOTALS)).toEqual({ categoryId: 'b', eraId: 'old', seen: 4, total: 10 });
  });

  it('moves on to the next unfinished category when the last one is complete', () => {
    expect(continueTarget(ERAS, playedLast('a', { a: 10 }), TOTALS)?.categoryId).toBe('b');
    expect(continueTarget(ERAS, playedLast('b', { a: 10, b: 10 }), TOTALS)?.categoryId).toBe('c');
  });

  it('wraps around to an earlier category that is still unfinished', () => {
    expect(continueTarget(ERAS, playedLast('c', { b: 10, c: 20 }), TOTALS)?.categoryId).toBe('a');
  });

  it('offers nothing when everything has been seen', () => {
    expect(continueTarget(ERAS, playedLast('c', { a: 10, b: 10, c: 20 }), TOTALS)).toBeNull();
  });
});
