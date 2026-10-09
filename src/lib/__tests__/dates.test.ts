import { describe, expect, it } from 'vitest';
import { toLocalDateKey, toPreviousLocalDateKey } from '@/lib/dates';

describe('local date keys (America/Argentina/Buenos_Aires)', () => {
  it('uses the local date, not UTC, late at night', () => {
    // 22:30 in Argentina on Oct 9 is already Oct 10 in UTC.
    const lateNight = new Date('2026-10-10T01:30:00Z');
    expect(lateNight.toISOString().slice(0, 10)).toBe('2026-10-10');
    expect(toLocalDateKey(lateNight)).toBe('2026-10-09');
  });

  it('returns the previous local day, across month and year boundaries', () => {
    expect(toPreviousLocalDateKey(new Date(2026, 9, 1, 12))).toBe('2026-09-30');
    expect(toPreviousLocalDateKey(new Date(2027, 0, 1, 0, 5))).toBe('2026-12-31');
  });
});
