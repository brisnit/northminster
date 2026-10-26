/**
 * Recurring schedules.
 *
 * Supported (covers how Northminster actually schedules things):
 *   - weekly on chosen weekdays, every N weeks         ("Every Wednesday")
 *   - monthly on the Nth weekday of the start date     ("Second Sunday of each month")
 *   - monthly on the same date
 * with an optional end date and skipped dates (exceptions).
 *
 * Occurrences are expanded on wall-clock dates, then converted to instants,
 * so 5:30 PM stays 5:30 PM across daylight-saving changes.
 */
import { addDays, daysBetween, isValidDate, zonedToInstant } from './time';

export type Freq = 'none' | 'weekly' | 'monthly_weekday' | 'monthly_date';
export const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface Schedule {
  startDate: string;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  allDay: boolean;
  timezone: string;
  recurrenceFreq: Freq;
  recurrenceInterval: number;
  recurrenceByDay: string[];
  recurrenceUntil: string | null;
  recurrenceExceptions: string[];
}

export interface Occurrence {
  date: string; // local start date
  endDate: string; // local end date (inclusive for all-day)
  start: Date;
  end: Date;
}

const weekdayOf = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();
const nthOfMonth = (d: string) => Math.ceil(Number(d.slice(8, 10)) / 7);
const isLastOfMonth = (d: string) => addDays(d, 7).slice(5, 7) !== d.slice(5, 7);

/** Duration of one occurrence in whole days (end date − start date). */
const spanDays = (s: Schedule) => (s.endDate ? Math.max(0, daysBetween(s.startDate, s.endDate)) : 0);

export function occurrenceFor(s: Schedule, date: string): Occurrence {
  const endDate = addDays(date, spanDays(s));
  if (s.allDay) {
    return { date, endDate, start: zonedToInstant(date, '00:00', s.timezone), end: zonedToInstant(addDays(endDate, 1), '00:00', s.timezone) };
  }
  const start = zonedToInstant(date, s.startTime ?? '00:00', s.timezone);
  let end = zonedToInstant(endDate, s.endTime ?? s.startTime ?? '00:00', s.timezone);
  if (!s.endTime) end = new Date(start.getTime() + 60 * 60 * 1000); // default 1 hour
  return { date, endDate, start, end };
}

/** Local dates on which the series occurs, from `fromDate` (inclusive), up to `max`. */
export function occurrenceDates(s: Schedule, fromDate: string, max = 12, horizonDays = 800): string[] {
  if (s.recurrenceFreq === 'none') return s.startDate >= fromDate || (s.endDate ?? s.startDate) >= fromDate ? [s.startDate] : [];
  const out: string[] = [];
  const skip = new Set(s.recurrenceExceptions);
  const interval = Math.max(1, s.recurrenceInterval || 1);
  const until = s.recurrenceUntil;
  const limit = addDays(fromDate > s.startDate ? fromDate : s.startDate, horizonDays);
  // Back up by the event length so a multi-day occurrence in progress still counts.
  const from = addDays(fromDate, -spanDays(s));

  const consider = (d: string) => {
    if (d < s.startDate || d < from || (until && d > until) || skip.has(d)) return;
    out.push(d);
  };

  if (s.recurrenceFreq === 'weekly') {
    const days = (s.recurrenceByDay.length ? s.recurrenceByDay : [WEEKDAYS[weekdayOf(s.startDate)]])
      .map((w) => WEEKDAYS.indexOf(w as Weekday)).filter((i) => i >= 0);
    // Anchor to the Sunday of the start week; step by `interval` weeks.
    const anchor = addDays(s.startDate, -weekdayOf(s.startDate));
    for (let week = anchor; week <= limit && out.length < max; week = addDays(week, 7 * interval)) {
      for (const wd of [...days].sort()) consider(addDays(week, wd));
    }
  } else {
    const [sy, sm] = s.startDate.split('-').map(Number);
    const sd = Number(s.startDate.slice(8, 10));
    const wd = weekdayOf(s.startDate);
    const nth = isLastOfMonth(s.startDate) && nthOfMonth(s.startDate) === 5 ? -1 : nthOfMonth(s.startDate);
    for (let k = 0; out.length < max; k += interval) {
      const y = sy + Math.floor((sm - 1 + k) / 12);
      const m = ((sm - 1 + k) % 12) + 1;
      const first = `${y}-${String(m).padStart(2, '0')}-01`;
      if (first > limit) break;
      let d: string | null = null;
      if (s.recurrenceFreq === 'monthly_date') {
        const cand = `${first.slice(0, 8)}${String(sd).padStart(2, '0')}`;
        d = isValidDate(cand) ? cand : null; // e.g. no 31st in November → skipped, like Google
      } else if (nth === -1) {
        let last = addDays(`${y + (m === 12 ? 1 : 0)}-${String((m % 12) + 1).padStart(2, '0')}-01`, -1);
        while (weekdayOf(last) !== wd) last = addDays(last, -1);
        d = last;
      } else {
        let cand = first;
        while (weekdayOf(cand) !== wd) cand = addDays(cand, 1);
        cand = addDays(cand, 7 * (nth - 1));
        d = cand.slice(5, 7) === first.slice(5, 7) ? cand : null;
      }
      if (d) consider(d);
    }
  }
  return out.sort().slice(0, max);
}

export function nextOccurrence(s: Schedule, now = new Date()): Occurrence | null {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: s.timezone }).format(now);
  for (const d of occurrenceDates(s, addDays(today, -1), 6)) {
    const occ = occurrenceFor(s, d);
    if (occ.end > now) return occ;
  }
  return null;
}

/** Instant the whole series is over, or null if it never ends. */
export function seriesEnd(s: Schedule): Date | null {
  if (s.recurrenceFreq === 'none') return occurrenceFor(s, s.startDate).end;
  if (!s.recurrenceUntil) return null;
  const last = occurrenceDates({ ...s, recurrenceExceptions: [] }, s.startDate, 5000).filter((d) => d <= s.recurrenceUntil!).pop();
  return last ? occurrenceFor(s, last).end : occurrenceFor(s, s.startDate).end;
}

/** Plain-language summary, e.g. "Every Wednesday" or "Second Sunday of each month". */
export function describeRecurrence(s: Schedule): string | null {
  if (s.recurrenceFreq === 'none') return null;
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const every = s.recurrenceInterval > 1 ? `Every ${s.recurrenceInterval === 2 ? 'other' : `${s.recurrenceInterval}th`}` : 'Every';
  if (s.recurrenceFreq === 'weekly') {
    const days = (s.recurrenceByDay.length ? s.recurrenceByDay : [WEEKDAYS[weekdayOf(s.startDate)]])
      .map((w) => names[WEEKDAYS.indexOf(w as Weekday)]);
    return `${every} ${days.join(' & ')}`;
  }
  if (s.recurrenceFreq === 'monthly_date') return `Monthly on the ${ordinal(Number(s.startDate.slice(8, 10)))}`;
  const nth = isLastOfMonth(s.startDate) && nthOfMonth(s.startDate) === 5 ? 'Last' : ['First', 'Second', 'Third', 'Fourth', 'Fifth'][nthOfMonth(s.startDate) - 1];
  return `${nth} ${names[weekdayOf(s.startDate)]} of ${s.recurrenceInterval > 1 ? `every ${s.recurrenceInterval} months` : 'each month'}`;
}

function ordinal(n: number) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

/** RFC 5545 recurrence lines for Google Calendar. */
export function toRecurrenceLines(s: Schedule): string[] | undefined {
  if (s.recurrenceFreq === 'none') return undefined;
  const parts = [`FREQ=${s.recurrenceFreq === 'weekly' ? 'WEEKLY' : 'MONTHLY'}`];
  if (s.recurrenceInterval > 1) parts.push(`INTERVAL=${s.recurrenceInterval}`);
  if (s.recurrenceFreq === 'weekly') {
    parts.push(`BYDAY=${(s.recurrenceByDay.length ? s.recurrenceByDay : [WEEKDAYS[weekdayOf(s.startDate)]]).join(',')}`);
  } else if (s.recurrenceFreq === 'monthly_weekday') {
    const nth = isLastOfMonth(s.startDate) && nthOfMonth(s.startDate) === 5 ? -1 : nthOfMonth(s.startDate);
    parts.push(`BYDAY=${nth}${WEEKDAYS[weekdayOf(s.startDate)]}`);
  } else {
    parts.push(`BYMONTHDAY=${Number(s.startDate.slice(8, 10))}`);
  }
  if (s.recurrenceUntil) {
    // With a TZID start, UNTIL must be UTC; use the end of the "until" day locally.
    const u = s.allDay ? s.recurrenceUntil.replaceAll('-', '') : zonedToInstant(addDays(s.recurrenceUntil, 1), '00:00', s.timezone);
    parts.push(`UNTIL=${typeof u === 'string' ? u : new Date(u.getTime() - 1000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`);
  }
  const lines = [`RRULE:${parts.join(';')}`];
  if (s.recurrenceExceptions.length) {
    const fmtEx = (d: string) => (s.allDay ? d.replaceAll('-', '') : `${d.replaceAll('-', '')}T${(s.startTime ?? '00:00').slice(0, 5).replace(':', '')}00`);
    lines.push(s.allDay
      ? `EXDATE;VALUE=DATE:${s.recurrenceExceptions.map(fmtEx).join(',')}`
      : `EXDATE;TZID=${s.timezone}:${s.recurrenceExceptions.map(fmtEx).join(',')}`);
  }
  return lines;
}
