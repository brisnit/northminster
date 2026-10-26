/**
 * Events CMS: validation, persistence, status changes and audit history.
 * Every function here assumes the caller already checked the user's role
 * (see requireRole in src/server/guard.ts).
 */
import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, isNull, lt, ne, or, sql } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';
import { randomUUID } from 'node:crypto';
import { db } from '@/db/client';
import { auditLog, event, eventCategory, eventImage, type EventRow } from '@/db/schema';
import type { SessionUser } from './auth';
import { occurrenceFor, seriesEnd, WEEKDAYS, type Freq, type Schedule } from './recurrence';
import { DEFAULT_TZ, hhmm, isValidDate, isValidTime, isValidTimeZone } from './time';
import { markChanged, syncEvent } from './calendar/sync';

export type EventStatus = EventRow['status'];
export type Intent = 'draft' | 'publish' | 'save' | 'preview';

export interface EventInput {
  title: string;
  summary: string;
  descriptionHtml: string;
  categoryId: string | null;
  imageId: string | null;
  imageAlt: string;
  allDay: boolean;
  timezone: string;
  startDate: string;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  recurrenceFreq: Freq;
  recurrenceInterval: number;
  recurrenceByDay: string[];
  recurrenceUntil: string | null;
  recurrenceExceptions: string[];
  venue: string;
  address: string;
  audience: string;
  cost: string;
  details: string[];
  registrationRequired: boolean;
  registrationUrl: string;
  registrationLabel: string;
  contact: string;
  notes: string;
  featured: boolean;
}

export type FieldErrors = Partial<Record<keyof EventInput | 'form', string>>;

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? '').trim().slice(0, max);
const opt = (f: FormData, k: string) => str(f, k) || null;

export function sanitizeDescription(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h3', 'h4', 'blockquote'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener', target: '_blank' }),
      b: 'strong', i: 'em', h1: 'h3', h2: 'h3', div: 'p',
    },
    exclusiveFilter: (frame) => frame.tag === 'p' && !frame.text.trim() && !frame.mediaChildren.length,
  }).trim();
}

const SAFE_LINK = /^(https?:\/\/[^\s]+|mailto:[^\s@]+@[^\s@]+|tel:\+?[\d\s().-]{7,})$/i;

/** Parse + validate the event form. Returns clean values and friendly errors. */
export function parseEventForm(f: FormData): { values: EventInput; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const allDay = f.get('allDay') === 'on';
  const freq = (['none', 'weekly', 'monthly_weekday', 'monthly_date'].includes(str(f, 'recurrenceFreq')) ? str(f, 'recurrenceFreq') : 'none') as Freq;

  const values: EventInput = {
    title: str(f, 'title', 140),
    summary: str(f, 'summary', 320),
    descriptionHtml: sanitizeDescription(String(f.get('descriptionHtml') ?? '').slice(0, 20000)),
    categoryId: opt(f, 'categoryId'),
    imageId: opt(f, 'imageId'),
    imageAlt: str(f, 'imageAlt', 300),
    allDay,
    timezone: str(f, 'timezone') || DEFAULT_TZ,
    startDate: str(f, 'startDate'),
    startTime: allDay ? null : opt(f, 'startTime'),
    endDate: opt(f, 'endDate'),
    endTime: allDay ? null : opt(f, 'endTime'),
    recurrenceFreq: freq,
    recurrenceInterval: Math.min(12, Math.max(1, Number(str(f, 'recurrenceInterval')) || 1)),
    recurrenceByDay: f.getAll('recurrenceByDay').map(String).filter((d) => (WEEKDAYS as readonly string[]).includes(d)),
    recurrenceUntil: freq === 'none' ? null : opt(f, 'recurrenceUntil'),
    recurrenceExceptions: freq === 'none' ? [] : [...new Set(str(f, 'recurrenceExceptions', 4000).split(/[\s,]+/).filter(Boolean))].sort(),
    venue: str(f, 'venue', 200),
    address: str(f, 'address', 300),
    audience: str(f, 'audience', 120),
    cost: str(f, 'cost', 200),
    details: str(f, 'details', 4000).split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean).slice(0, 15),
    registrationRequired: f.get('registrationRequired') === 'on',
    registrationUrl: str(f, 'registrationUrl', 500),
    registrationLabel: str(f, 'registrationLabel', 60),
    contact: str(f, 'contact', 200),
    notes: str(f, 'notes', 2000),
    featured: f.get('featured') === 'on',
  };

  if (!values.title) errors.title = 'Give the event a title.';
  if (!values.startDate) errors.startDate = 'Choose the date the event starts.';
  else if (!isValidDate(values.startDate)) errors.startDate = 'That start date isn’t a real date.';
  if (!values.allDay && !values.startTime) errors.startTime = 'Add a start time, or mark the event as all-day.';
  if (values.startTime && !isValidTime(values.startTime)) errors.startTime = 'Use a time like 6:00 PM.';
  if (values.endTime && !isValidTime(values.endTime)) errors.endTime = 'Use a time like 8:30 PM.';
  if (values.endDate && !isValidDate(values.endDate)) errors.endDate = 'That end date isn’t a real date.';
  if (!isValidTimeZone(values.timezone)) errors.timezone = 'Unknown time zone.';

  const endDate = values.endDate ?? values.startDate;
  if (!errors.startDate && !errors.endDate && endDate < values.startDate) errors.endDate = 'The event can’t end before it starts.';
  else if (!errors.startDate && endDate === values.startDate && values.startTime && values.endTime && values.endTime <= values.startTime) {
    errors.endTime = 'The end time must be after the start time.';
  }

  if (freq === 'weekly' && !values.recurrenceByDay.length) errors.recurrenceByDay = 'Pick at least one day of the week.';
  if (values.recurrenceUntil && !isValidDate(values.recurrenceUntil)) errors.recurrenceUntil = 'That isn’t a real date.';
  else if (values.recurrenceUntil && values.startDate && values.recurrenceUntil < values.startDate) errors.recurrenceUntil = 'The repeat end date must be after the first date.';
  if (values.recurrenceExceptions.some((d) => !isValidDate(d))) errors.recurrenceExceptions = 'Enter skipped dates as YYYY-MM-DD, separated by commas.';
  if (freq !== 'none' && values.endDate && values.endDate !== values.startDate) errors.endDate = 'Repeating events must start and end on the same day.';

  if (values.registrationUrl && !SAFE_LINK.test(values.registrationUrl)) errors.registrationUrl = 'Use a full link starting with https://, or mailto: / tel:.';
  if (values.registrationRequired && !values.registrationUrl && !values.contact) errors.registrationUrl = 'Add a registration link, or contact details so people know how to sign up.';
  if (values.imageId && !values.imageAlt) errors.imageAlt = 'Describe the photo for people using screen readers (e.g. “Kids painting at a craft table”).';

  return { values, errors };
}

function scheduleOf(v: Pick<EventInput, 'startDate' | 'startTime' | 'endDate' | 'endTime' | 'allDay' | 'timezone' | 'recurrenceFreq' | 'recurrenceInterval' | 'recurrenceByDay' | 'recurrenceUntil' | 'recurrenceExceptions'>): Schedule {
  return { ...v, startTime: hhmm(v.startTime), endTime: hhmm(v.endTime) };
}

function resolvedTimes(v: EventInput) {
  const s = scheduleOf(v);
  const first = occurrenceFor(s, v.startDate);
  return { startsAt: first.start, endsAt: first.end, seriesEndsAt: seriesEnd(s) };
}

const slugBase = (title: string) =>
  title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'event';

async function uniqueSlug(title: string, startDate: string, excludeId?: string) {
  const base = `${slugBase(title)}-${startDate}`;
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const [hit] = await db.select({ id: event.id }).from(event).where(and(eq(event.slug, candidate), excludeId ? ne(event.id, excludeId) : undefined)).limit(1);
    if (!hit) return candidate;
  }
  return `${base}-${randomUUID().slice(0, 6)}`;
}

/** Fields whose change should be pushed to Google Calendar. */
const CALENDAR_FIELDS: (keyof EventRow)[] = [
  'title', 'summary', 'slug', 'startDate', 'startTime', 'endDate', 'endTime', 'allDay', 'timezone',
  'recurrenceFreq', 'recurrenceInterval', 'recurrenceByDay', 'recurrenceUntil', 'recurrenceExceptions',
  'venue', 'address', 'audience', 'cost', 'details', 'registrationUrl', 'registrationLabel', 'contact', 'status', 'deletedAt',
];

function diff(before: Partial<EventRow>, after: Partial<EventRow>) {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of Object.keys(after) as (keyof EventRow)[]) {
    const a = JSON.stringify(before[k] ?? null);
    const b = JSON.stringify(after[k] ?? null);
    if (a !== b && !['updatedAt', 'updatedBy'].includes(k)) out[k] = { from: before[k] ?? null, to: after[k] ?? null };
  }
  return out;
}

export async function audit(user: SessionUser | null, action: string, entityType: string, entityId: string | null, changes?: unknown) {
  await db.insert(auditLog).values({ actorId: user?.id ?? null, actorEmail: user?.email ?? null, action, entityType, entityId, changes: changes ?? null });
}

const affectsCalendar = (changes: Record<string, unknown>) => CALENDAR_FIELDS.some((k) => k in changes);

async function afterChange(id: string, changes: Record<string, unknown>, wasOrIsVisible: boolean) {
  if (!affectsCalendar(changes)) return null;
  await markChanged(id);
  if (!wasOrIsVisible) {
    // Drafts that were never published don't need Google at all.
    await db.update(event).set({ syncStatus: 'not_applicable', syncError: null }).where(and(eq(event.id, id), eq(event.onCalendar, false), eq(event.syncedVersion, 0)));
    return null;
  }
  return syncEvent(id);
}

const visible = (s: EventStatus) => s === 'published' || s === 'cancelled';

export async function createEvent(v: EventInput, user: SessionUser, intent: Intent, creationKey: string | null) {
  if (creationKey) {
    const [existing] = await db.select({ id: event.id }).from(event).where(eq(event.creationKey, creationKey)).limit(1);
    if (existing) return { id: existing.id, sync: null, duplicate: true };
  }
  const status: EventStatus = intent === 'publish' ? 'published' : 'draft';
  const id = randomUUID();
  const row = {
    id,
    ...v,
    ...resolvedTimes(v),
    slug: await uniqueSlug(v.title, v.startDate),
    status,
    publishedAt: status === 'published' ? new Date() : null,
    googleEventId: `npc${id.replaceAll('-', '')}`,
    creationKey,
    createdBy: user.id,
    updatedBy: user.id,
  };
  try {
    await db.insert(event).values(row);
  } catch (e) {
    // Two identical submissions racing: the unique creation key lets only one win.
    if (creationKey && /creation_key|unique/i.test(String((e as Error).message) + String((e as { cause?: Error }).cause?.message))) {
      const [existing] = await db.select({ id: event.id }).from(event).where(eq(event.creationKey, creationKey)).limit(1);
      if (existing) return { id: existing.id, sync: null, duplicate: true };
    }
    throw e;
  }
  await audit(user, status === 'published' ? 'event.create_published' : 'event.create_draft', 'event', id, { title: v.title });
  const sync = visible(status) ? await afterChange(id, { status }, true) : null;
  return { id, sync, duplicate: false };
}

export async function updateEvent(id: string, v: EventInput, user: SessionUser, intent: Intent) {
  const before = await getEventRow(id);
  if (!before || before.deletedAt) throw new Error('Event not found.');
  let status = before.status;
  if (intent === 'publish') status = 'published';
  if (intent === 'draft') status = 'draft';

  const titleOrDateChanged = before.title !== v.title || before.startDate !== v.startDate;
  // Keep URLs stable once published; drafts get fresh slugs as titles change.
  const slug = titleOrDateChanged && before.status === 'draft' && !before.publishedAt ? await uniqueSlug(v.title, v.startDate, id) : before.slug;
  const next = {
    ...v,
    ...resolvedTimes(v),
    slug,
    status,
    publishedAt: status === 'published' && !before.publishedAt ? new Date() : before.publishedAt,
    updatedBy: user.id,
    updatedAt: new Date(),
  };
  const changes = diff(before, next);
  await db.update(event).set(next).where(eq(event.id, id));
  if (Object.keys(changes).length) await audit(user, 'event.update', 'event', id, changes);
  const sync = await afterChange(id, changes, visible(before.status) || visible(status) || before.onCalendar);
  return { sync };
}

export async function changeStatus(id: string, to: EventStatus, user: SessionUser) {
  const before = await getEventRow(id);
  if (!before || before.deletedAt) throw new Error('Event not found.');
  if (before.status === to) return { sync: null };
  await db.update(event).set({
    status: to,
    publishedAt: to === 'published' && !before.publishedAt ? new Date() : before.publishedAt,
    updatedBy: user.id,
    updatedAt: new Date(),
  }).where(eq(event.id, id));
  await audit(user, `event.status.${to}`, 'event', id, { status: { from: before.status, to } });
  const sync = await afterChange(id, { status: to }, visible(before.status) || visible(to) || before.onCalendar);
  return { sync };
}

export async function duplicateEvent(id: string, user: SessionUser) {
  const src = await getEventRow(id);
  if (!src) throw new Error('Event not found.');
  const newId = randomUUID();
  const title = `${src.title} (copy)`.slice(0, 140);
  await db.insert(event).values({
    ...src,
    id: newId,
    title,
    slug: await uniqueSlug(title, src.startDate),
    status: 'draft',
    featured: false,
    publishedAt: null,
    deletedAt: null,
    googleEventId: `npc${newId.replaceAll('-', '')}`,
    syncStatus: 'not_applicable',
    syncVersion: 1,
    syncedVersion: 0,
    syncError: null,
    syncAttempts: 0,
    syncNextAttemptAt: null,
    syncLockedUntil: null,
    lastSyncedAt: null,
    onCalendar: false,
    creationKey: null,
    createdBy: user.id,
    updatedBy: user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await audit(user, 'event.duplicate', 'event', newId, { from: id });
  return newId;
}

/** Soft delete: hidden everywhere and removed from Google Calendar. */
export async function deleteEvent(id: string, user: SessionUser) {
  const before = await getEventRow(id);
  if (!before || before.deletedAt) return { sync: null };
  await db.update(event).set({ deletedAt: new Date(), featured: false, updatedBy: user.id, updatedAt: new Date() }).where(eq(event.id, id));
  await audit(user, 'event.delete', 'event', id, { title: before.title, status: before.status });
  const sync = await afterChange(id, { deletedAt: true }, visible(before.status) || before.onCalendar);
  return { sync };
}

export async function getEventRow(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select().from(event).where(eq(event.id, id)).limit(1);
  return row ?? null;
}

export async function getEventWithImage(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select({ event, image: eventImage, category: eventCategory })
    .from(event)
    .leftJoin(eventImage, eq(event.imageId, eventImage.id))
    .leftJoin(eventCategory, eq(event.categoryId, eventCategory.id))
    .where(eq(event.id, id)).limit(1);
  return row ?? null;
}

export async function listCategories() {
  return db.select().from(eventCategory).orderBy(asc(eventCategory.sortOrder), asc(eventCategory.name));
}

export type AdminView = 'upcoming' | 'past' | 'draft' | 'published' | 'cancelled' | 'archived' | 'all';

export async function listAdminEvents(view: AdminView, q: string) {
  const now = new Date();
  const notOver = or(isNull(event.seriesEndsAt), gte(event.seriesEndsAt, now));
  const filters = {
    upcoming: and(notOver, ne(event.status, 'archived')),
    past: and(isNotNull(event.seriesEndsAt), lt(event.seriesEndsAt, now), ne(event.status, 'archived')),
    draft: eq(event.status, 'draft'),
    published: eq(event.status, 'published'),
    cancelled: eq(event.status, 'cancelled'),
    archived: eq(event.status, 'archived'),
    all: undefined,
  }[view];
  return db.select({ event, image: eventImage })
    .from(event)
    .leftJoin(eventImage, eq(event.imageId, eventImage.id))
    .where(and(isNull(event.deletedAt), filters, q ? ilike(event.title, `%${q.replace(/[%_\\]/g, '\\$&')}%`) : undefined))
    .orderBy(view === 'past' ? desc(event.startsAt) : asc(event.startsAt))
    .limit(200);
}

export async function countsByStatus() {
  const rows = await db.select({ status: event.status, n: sql<number>`count(*)::int` }).from(event).where(isNull(event.deletedAt)).groupBy(event.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<EventStatus, number>>;
}

export async function syncProblems() {
  return db.select({ id: event.id, title: event.title, syncStatus: event.syncStatus, syncError: event.syncError })
    .from(event).where(and(inArray(event.syncStatus, ['error', 'not_configured']))).limit(50);
}

/** Convert a DB row back into form values (for editing). */
export function rowToInput(e: EventRow): EventInput {
  return {
    title: e.title, summary: e.summary, descriptionHtml: e.descriptionHtml, categoryId: e.categoryId, imageId: e.imageId,
    imageAlt: e.imageAlt, allDay: e.allDay, timezone: e.timezone, startDate: e.startDate, startTime: hhmm(e.startTime),
    endDate: e.endDate, endTime: hhmm(e.endTime), recurrenceFreq: e.recurrenceFreq, recurrenceInterval: e.recurrenceInterval,
    recurrenceByDay: e.recurrenceByDay, recurrenceUntil: e.recurrenceUntil, recurrenceExceptions: e.recurrenceExceptions,
    venue: e.venue, address: e.address, audience: e.audience, cost: e.cost, details: e.details,
    registrationRequired: e.registrationRequired, registrationUrl: e.registrationUrl, registrationLabel: e.registrationLabel,
    contact: e.contact, notes: e.notes, featured: e.featured,
  };
}
