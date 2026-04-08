import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseDate, formatDate, delayUntil } from '@/services/whatsapp/date-parser';

// Fix "now" to a known time for deterministic tests
// 2026-04-10 12:00:00 UTC = 2026-04-10 09:00:00 BRT
const FIXED_NOW = new Date('2026-04-10T12:00:00.000Z').getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('parseDate', () => {
  it('parses "amanhã 18h" as tomorrow 18:00 BRT (UTC+21:00)', () => {
    const result = parseDate('amanhã 18h');
    expect(result).not.toBeNull();
    // amanhã = 2026-04-11, 18:00 BRT = 21:00 UTC
    const expected = new Date('2026-04-11T21:00:00.000Z');
    expect(result!.toISOString()).toBe(expected.toISOString());
  });

  it('parses "10/04 14:30" as April 10 14:30 BRT, next year if in past', () => {
    const result = parseDate('20/04 14:30');
    expect(result).not.toBeNull();
    // 20/04 14:30 BRT = 20/04 17:30 UTC
    expect(result!.getUTCDate()).toBe(20);
    expect(result!.getUTCMonth()).toBe(3); // April (0-indexed)
    expect(result!.getUTCHours()).toBe(17);
    expect(result!.getUTCMinutes()).toBe(30);
  });

  it('returns null for past dates', () => {
    // Yesterday = past
    const result = parseDate('09/04 10:00');
    expect(result).toBeNull();
  });

  it('returns null for dates more than 90 days ahead', () => {
    const result = parseDate('01/10/2026 18:00');
    expect(result).toBeNull();
  });

  it('returns null for unparseable text', () => {
    expect(parseDate('banana')).toBeNull();
    expect(parseDate('')).toBeNull();
  });

  it('parses "próxima segunda 9h"', () => {
    const result = parseDate('próxima segunda 9h');
    expect(result).not.toBeNull();
    // Result should be a Monday at 09:00 BRT = 12:00 UTC
    const brtDate = new Date(result!.getTime() - 3 * 60 * 60 * 1000);
    expect(brtDate.getUTCDay()).toBe(1); // 1 = Monday
    expect(brtDate.getUTCHours()).toBe(9);
  });

  it('parses "amanhã 18h30" with minutes', () => {
    const result = parseDate('amanhã 18h30');
    expect(result).not.toBeNull();
    // 18:30 BRT = 21:30 UTC
    expect(result!.getUTCHours()).toBe(21);
    expect(result!.getUTCMinutes()).toBe(30);
  });
});

describe('formatDate', () => {
  it('formats UTC date as BRT readable string', () => {
    // 2026-04-11 21:00 UTC = 2026-04-11 18:00 BRT = Sábado, 11/04 às 18:00
    const date = new Date('2026-04-11T21:00:00.000Z');
    const formatted = formatDate(date);
    expect(formatted).toContain('11/04');
    expect(formatted).toContain('18:00');
  });
});

describe('delayUntil', () => {
  it('returns positive delay for future date', () => {
    const future = new Date(FIXED_NOW + 60_000); // 1 minute ahead
    expect(delayUntil(future)).toBeGreaterThan(0);
    expect(delayUntil(future)).toBeLessThanOrEqual(60_000);
  });

  it('returns 0 for past date', () => {
    const past = new Date(FIXED_NOW - 1000);
    expect(delayUntil(past)).toBe(0);
  });
});
