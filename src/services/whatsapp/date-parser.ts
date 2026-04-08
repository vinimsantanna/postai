import * as chrono from 'chrono-node';

// PostAI default timezone: BRT (UTC-3)
const BRT_OFFSET_HOURS = 3; // BRT = UTC-3, so UTC = BRT + 3h
const MAX_SCHEDULE_DAYS = 90;

/**
 * Parses natural-language date strings in Portuguese.
 * Returns a UTC Date, or null if parsing fails / date is invalid.
 *
 * Examples: "amanhã 18h", "10/04 14:30", "próxima segunda 9h", "01/05/2026 08:00"
 *
 * Strategy: extract date/time components from chrono (system-timezone-independent)
 * and construct a UTC Date treating those components as BRT local time.
 * Using Date.UTC() bypasses the process timezone so this works on both UTC servers
 * and BRT developer machines without double-applying the offset.
 */
export function parseDate(text: string): Date | null {
  const now = new Date();

  // Normalize common Portuguese shorthand before parsing
  const normalized = text
    .replace(/(\d+)h(\d+)?/gi, (_, h, m) => `${h}:${m ?? '00'}`)  // "18h30" → "18:30"
    .replace(/próxima?\s+/gi, 'next ')
    .replace(/amanhã/gi, 'tomorrow')
    .replace(/segunda(-feira)?/gi, 'monday')
    .replace(/terça(-feira)?/gi, 'tuesday')
    .replace(/quarta(-feira)?/gi, 'wednesday')
    .replace(/quinta(-feira)?/gi, 'thursday')
    .replace(/sexta(-feira)?/gi, 'friday')
    .replace(/sábado/gi, 'saturday')
    .replace(/domingo/gi, 'sunday')
    .replace(/hoje/gi, 'today')
    .replace(/(\d{2})\/(\d{2})\/(\d{4})/g, '$2/$1/$3') // DD/MM/YYYY → MM/DD/YYYY
    .replace(/(\d{2})\/(\d{2})(?!\/)/g, '$1/$2');       // DD/MM → MM/DD (chrono expects US format)

  const results = chrono.parse(normalized, now, { forwardDate: true });
  if (results.length === 0) return null;

  const comp = results[0].start;
  const year   = comp.get('year');
  const month  = comp.get('month');  // 1-indexed
  const day    = comp.get('day');
  const hour   = comp.get('hour')   ?? 0;
  const minute = comp.get('minute') ?? 0;

  if (!year || !month || !day) return null;

  // Build the date treating components as BRT local time, using Date.UTC to avoid
  // any local-timezone influence (works on UTC servers and BRT dev machines alike).
  const brtNaiveUtc = Date.UTC(year, month - 1, day, hour, minute);
  const utcDate = new Date(brtNaiveUtc + BRT_OFFSET_HOURS * 60 * 60 * 1000);

  // Must be in the future (at least 5 minutes from now)
  if (utcDate.getTime() < Date.now() + 5 * 60 * 1000) return null;

  // Must not exceed 90 days
  if (utcDate.getTime() > Date.now() + MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1000) return null;

  return utcDate;
}

/**
 * Formats a UTC Date for display in Portuguese (BRT).
 * Example: "Terça-feira, 09/04 às 18:00"
 */
export function formatDate(utcDate: Date): string {
  const brtDate = new Date(utcDate.getTime() - BRT_OFFSET_HOURS * 60 * 60 * 1000);

  const weekday = brtDate.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' });
  const day = String(brtDate.getUTCDate()).padStart(2, '0');
  const month = String(brtDate.getUTCMonth() + 1).padStart(2, '0');
  const hours = String(brtDate.getUTCHours()).padStart(2, '0');
  const minutes = String(brtDate.getUTCMinutes()).padStart(2, '0');

  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalizedWeekday}, ${day}/${month} às ${hours}:${minutes}`;
}

/**
 * Returns the delay in ms from now until the scheduled date.
 */
export function delayUntil(utcDate: Date): number {
  return Math.max(0, utcDate.getTime() - Date.now());
}
