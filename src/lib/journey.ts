// El viaje por la historia: cuánto recorrió el jugador de cada era y cuántos años de historia lleva explorados.
// Lógica pura, sin React ni navegador (ver src/lib/__tests__/journey.test.ts).

import type { EraDef } from '@/data/catalog';
import type { Progress } from '@/lib/progress';

export interface EraTrip {
  era: EraDef;
  seen: number;
  total: number;
  /** 0 to 1: share of the era's questions the player has answered. */
  fraction: number;
  complete: boolean;
  /** Years of history the era covers. */
  years: number;
}

/** Last year of an era (`now` for the era that runs until today). */
export function eraEnd(era: EraDef, now: number): number {
  return era.endYear ?? now;
}

/** How much of each era the player has traveled, in chronological order. */
export function planTrip(
  eras: readonly EraDef[],
  progress: Progress | null,
  totals: Readonly<Record<string, number>>,
  now: number,
): EraTrip[] {
  return eras.map(era => {
    const total = era.categoryIds.reduce((sum, id) => sum + (totals[id] ?? 0), 0);
    const seen = era.categoryIds.reduce(
      (sum, id) => sum + Math.min(progress?.seen[id]?.length ?? 0, totals[id] ?? 0),
      0,
    );
    const fraction = total > 0 ? seen / total : 0;
    return {
      era,
      seen,
      total,
      fraction,
      complete: total > 0 && seen >= total,
      years: Math.max(eraEnd(era, now) - era.startYear, 0),
    };
  });
}

/** Years of history explored: each era counts in proportion to how much of it was answered. */
export function yearsExplored(trip: readonly EraTrip[]): number {
  return Math.round(trip.reduce((sum, stop) => sum + stop.fraction * stop.years, 0));
}

/** Years covered by the whole journey. */
export function totalYears(trip: readonly EraTrip[]): number {
  return trip.reduce((sum, stop) => sum + stop.years, 0);
}

/** Where the player is: the first era that is not finished yet (the last one if all are). */
export function currentStop(trip: readonly EraTrip[]): number {
  const index = trip.findIndex(stop => !stop.complete);
  return index === -1 ? Math.max(trip.length - 1, 0) : index;
}

/** Where "continue" should take the player. */
export interface ContinueTarget {
  categoryId: string;
  eraId: string;
  seen: number;
  total: number;
}

/**
 * The category to offer on the home screen: the one played last if it still has questions to see,
 * otherwise the next unfinished category (following the timeline, wrapping around).
 * `null` when the player has not started or has seen everything.
 */
export function continueTarget(
  eras: readonly EraDef[],
  progress: Progress | null,
  totals: Readonly<Record<string, number>>,
): ContinueTarget | null {
  const last = progress?.lastCategory;
  if (!progress || !last) return null;
  const flat = eras.flatMap(era => era.categoryIds.map(categoryId => ({ categoryId, eraId: era.id })));
  const start = flat.findIndex(item => item.categoryId === last);
  if (start === -1) return null;
  for (let step = 0; step < flat.length; step++) {
    const item = flat[(start + step) % flat.length];
    const total = totals[item.categoryId] ?? 0;
    const seen = Math.min(progress.seen[item.categoryId]?.length ?? 0, total);
    if (total > 0 && seen < total) return { ...item, seen, total };
  }
  return null;
}
