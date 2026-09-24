/**
 * Date helpers. Event/sermon times are authored as local Pacific time
 * ("2026-09-25T18:00") and formatted deterministically, regardless of the
 * time zone of the machine that builds the site.
 */

const TZ = 'America/Los_Angeles';

type Parts = { y: number; m: number; d: number; h: number; min: number };

function parse(iso: string): Parts {
  const [date, time = '00:00'] = iso.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return { y, m, d, h, min };
}

/** A Date holding the wall-clock parts in UTC, for time-zone-free formatting. */
function wall(iso: string) {
  const p = parse(iso);
  return new Date(Date.UTC(p.y, p.m - 1, p.d, p.h, p.min));
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts });

export const formatDate = (iso: string) => fmt({ month: 'long', day: 'numeric', year: 'numeric' }).format(wall(iso));
export const formatShortDate = (iso: string) => fmt({ month: 'short', day: 'numeric' }).format(wall(iso));
export const formatWeekday = (iso: string) => fmt({ weekday: 'long' }).format(wall(iso));
export const formatMonthShort = (iso: string) => fmt({ month: 'short' }).format(wall(iso));
export const formatDayNum = (iso: string) => fmt({ day: 'numeric' }).format(wall(iso));

export function formatTime(iso: string) {
  const { h, min } = parse(iso);
  const hour = ((h + 11) % 12) + 1;
  return `${hour}${min ? `:${String(min).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** Converts a Pacific wall-clock ISO string into a real instant (UTC ISO). */
export function toInstant(iso: string) {
  const guess = wall(iso).getTime();
  const tzParts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(tzParts.find((p) => p.type === t)?.value);
  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  const offset = asIfUtc - guess;
  return new Date(guess - offset).toISOString();
}
