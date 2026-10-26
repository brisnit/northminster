/**
 * Time-zone math without external dependencies.
 * Events are entered as wall-clock values ("2026-11-04", "17:30") in a named
 * zone. These helpers convert them to real instants correctly across DST.
 */

export const DEFAULT_TZ = 'America/Los_Angeles';

const pad = (n: number) => String(n).padStart(2, '0');

function offsetMs(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Wall-clock date + time in `timeZone` → Date (UTC instant). */
export function zonedToInstant(dateStr: string, timeStr: string | null | undefined, timeZone: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh = 0, mm = 0] = (timeStr ?? '00:00').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes handle the hour on either side of a DST transition.
  let instant = guess - offsetMs(guess, timeZone);
  instant = guess - offsetMs(instant, timeZone);
  return new Date(instant);
}

/** Today's date (YYYY-MM-DD) in a zone. */
export function todayIn(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function daysBetween(a: string, b: string) {
  const ms = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((ms(b) - ms(a)) / 86_400_000);
}

export function isValidDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidTime(s: string) {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(s);
}

export function isValidTimeZone(tz: string) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

/** "HH:MM[:SS]" → "HH:MM" */
export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : null);

/** Formatting helpers for wall-clock values (no time-zone shifting). */
function wall(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...o });
export const fmtLongDate = (d: string) => fmt({ month: 'long', day: 'numeric', year: 'numeric' }).format(wall(d));
export const fmtWeekday = (d: string) => fmt({ weekday: 'long' }).format(wall(d));
export const fmtMonthShort = (d: string) => fmt({ month: 'short' }).format(wall(d));
export const fmtDayNum = (d: string) => fmt({ day: 'numeric' }).format(wall(d));
export const fmtShortDate = (d: string) => fmt({ month: 'short', day: 'numeric' }).format(wall(d));

export function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}${m ? `:${pad(m)}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
}
