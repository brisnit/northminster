/**
 * Read-only queries for the public website. One source of truth: the
 * homepage, /events and /events/[slug] all read published events from here.
 */
import { and, eq, gte, inArray, isNull, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { event, eventCategory, eventImage, type EventRow, type EventImageRow } from '@/db/schema';
import { describeRecurrence, nextOccurrence, occurrenceDates, occurrenceFor, type Schedule } from './recurrence';
import { addDays, fmtTime, hhmm, todayIn } from './time';

export interface PublicImage { url: string; width: number; height: number; focalX: number; focalY: number; alt: string }

export interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  summary: string;
  descriptionHtml: string;
  status: 'published' | 'cancelled';
  featured: boolean;
  category: string | null;
  allDay: boolean;
  timezone: string;
  /** The next (or only) occurrence, as local wall-clock values + instants. */
  date: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  start: Date;
  end: Date;
  timeLabel: string;
  recurrenceText: string | null;
  upcomingDates: string[];
  isPast: boolean;
  venue: string;
  address: string;
  audience: string;
  cost: string;
  details: string[];
  registrationRequired: boolean;
  registrationUrl: string;
  registrationLabel: string;
  contact: string;
  image: PublicImage | null;
}

const schedule = (e: EventRow): Schedule => ({ ...e, startTime: hhmm(e.startTime), endTime: hhmm(e.endTime) });

function toPublic(e: EventRow, img: EventImageRow | null, category: string | null, now: Date): PublicEvent {
  const s = schedule(e);
  const occ = nextOccurrence(s, now) ?? occurrenceFor(s, e.startDate);
  const startTime = s.allDay ? null : s.startTime;
  const endTime = s.allDay ? null : s.endTime;
  return {
    id: e.id, slug: e.slug, title: e.title, summary: e.summary, descriptionHtml: e.descriptionHtml,
    status: e.status as PublicEvent['status'], featured: e.featured, category,
    allDay: e.allDay, timezone: e.timezone,
    date: occ.date, endDate: occ.endDate, startTime, endTime, start: occ.start, end: occ.end,
    timeLabel: s.allDay ? 'All day' : endTime ? `${fmtTime(startTime!)} – ${fmtTime(endTime)}` : fmtTime(startTime!),
    recurrenceText: describeRecurrence(s),
    upcomingDates: s.recurrenceFreq === 'none' ? [] : occurrenceDates(s, todayIn(s.timezone, now), 6),
    isPast: occ.end <= now,
    venue: e.venue, address: e.address, audience: e.audience, cost: e.cost, details: e.details,
    registrationRequired: e.registrationRequired, registrationUrl: e.registrationUrl,
    registrationLabel: e.registrationLabel || (e.registrationRequired ? 'Register' : 'Learn more'),
    contact: e.contact,
    image: img ? { url: img.url, width: img.width, height: img.height, focalX: img.focalX, focalY: img.focalY, alt: e.imageAlt } : null,
  };
}

async function query(where: ReturnType<typeof and>) {
  return db.select({ event, image: eventImage, category: eventCategory.name })
    .from(event)
    .leftJoin(eventImage, eq(event.imageId, eventImage.id))
    .leftJoin(eventCategory, eq(event.categoryId, eventCategory.id))
    .where(where);
}

/** Published (and cancelled, labeled) events that haven't finished, soonest first. */
export async function upcomingEvents(opts: { includeCancelled?: boolean; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  const statuses: EventRow['status'][] = opts.includeCancelled === false ? ['published'] : ['published', 'cancelled'];
  const rows = await query(and(
    inArray(event.status, statuses),
    isNull(event.deletedAt),
    or(isNull(event.seriesEndsAt), gte(event.seriesEndsAt, now)),
  ));
  return rows
    .map((r) => toPublic(r.event, r.image, r.category, now))
    .filter((e) => !e.isPast)
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.title.localeCompare(b.title));
}

/**
 * Homepage: the next few published events, giving featured events priority
 * (within the next ~60 days) but never showing anything that's over.
 */
export async function homepageEvents(limit = 4, now = new Date()) {
  const all = await upcomingEvents({ includeCancelled: false, now });
  const horizon = new Date(now.getTime() + 60 * 86_400_000);
  const featured = all.filter((e) => e.featured && e.start <= horizon);
  const picked = [...featured, ...all.filter((e) => !featured.includes(e))].slice(0, limit);
  return picked.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export async function eventBySlug(slug: string, now = new Date()) {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const [r] = await query(and(eq(event.slug, slug), inArray(event.status, ['published', 'cancelled']), isNull(event.deletedAt)));
  return r ? toPublic(r.event, r.image, r.category, now) : null;
}

/** Admin preview: any status, by id. */
export async function eventForPreview(id: string, now = new Date()) {
  const [r] = await query(and(eq(event.id, id), isNull(event.deletedAt)));
  if (!r) return null;
  return { ...toPublic(r.event, r.image, r.category, now), status: r.event.status, isDraft: r.event.status !== 'published' && r.event.status !== 'cancelled' };
}

export { addDays };

/** Build a public-page view of unsaved form values (admin preview). */
export function previewFromInput(v: import('./events').EventInput, img: EventImageRow | null, now = new Date()): PublicEvent | null {
  if (!v.title || !/^\d{4}-\d{2}-\d{2}$/.test(v.startDate)) return null;
  try {
    const fake = {
      ...v, id: 'preview', slug: 'preview', status: 'published', startsAt: now, endsAt: now, seriesEndsAt: null,
      startTime: v.startTime, endTime: v.endTime,
    } as unknown as EventRow;
    return toPublic(fake, img, null, now);
  } catch {
    return null;
  }
}
