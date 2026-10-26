/**
 * Google Calendar synchronization (CMS → Google, one way).
 *
 * Model: every event row carries `syncVersion` (bumped on each change) and
 * `syncedVersion` (last version Google confirmed). Syncing is *reconciliation*:
 * look at the event's current state and make Google match it. Retrying is
 * always safe, and the Google event id is derived from our UUID, so a
 * timed-out create can never produce a duplicate.
 *
 * Policy (also in docs/EVENTS-ADMIN.md):
 *   published  → event exists on the calendar, kept up to date
 *   cancelled  → stays on the calendar, titled "CANCELLED: …" with a note
 *   draft / archived / deleted → removed from the calendar
 * Events already on the calendar that the CMS didn't create are never touched.
 */
import { and, eq, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { event, type EventRow } from '@/db/schema';
import { church, fullAddress } from '@/config/site';
import { toRecurrenceLines } from '../recurrence';
import { hhmm } from '../time';
import { env } from '../env';
import { calendarConfig, CalendarError, google, type CalendarConfig, type GoogleEvent } from './google';

const LOCK_SECONDS = 60;
const BACKOFF_MINUTES = [1, 5, 30, 120, 360, 1440];

const siteUrl = () => (env('PUBLIC_SITE_URL') ?? 'https://northminsterclairmont.org').replace(/\/$/, '');

export const shouldBeOnCalendar = (e: Pick<EventRow, 'status' | 'deletedAt'>) =>
  !e.deletedAt && (e.status === 'published' || e.status === 'cancelled');

/** Build the Google Calendar representation of an event. */
export function toGoogleEvent(e: EventRow): GoogleEvent {
  const cancelled = e.status === 'cancelled';
  const url = `${siteUrl()}/events/${e.slug}`;
  const lines: string[] = [];
  if (cancelled) lines.push('THIS EVENT HAS BEEN CANCELLED.', '');
  if (e.summary) lines.push(e.summary, '');
  const facts = [
    e.audience && `For: ${e.audience}`,
    e.cost && `Cost: ${e.cost}`,
    e.contact && `Contact: ${e.contact}`,
  ].filter(Boolean) as string[];
  if (facts.length) lines.push(...facts, '');
  if (e.details.length) lines.push(...e.details.map((d) => `• ${d}`), '');
  if (e.registrationUrl && !cancelled) lines.push(`${e.registrationLabel || 'Register'}: ${e.registrationUrl}`, '');
  lines.push(`Details: ${url}`);

  const where = [e.venue, e.address || fullAddress].filter(Boolean).join(', ');
  const time = (d: string, t: string | null) => ({ dateTime: `${d}T${hhmm(t) ?? '00:00'}:00`, timeZone: e.timezone });
  const endDate = e.endDate ?? e.startDate;
  const nextDay = (d: string) => {
    const dt = new Date(`${d}T12:00:00Z`); dt.setUTCDate(dt.getUTCDate() + 1); return dt.toISOString().slice(0, 10);
  };
  const start = e.allDay ? { date: e.startDate } : time(e.startDate, e.startTime);
  const end = e.allDay
    ? { date: nextDay(endDate) } // Google all-day end dates are exclusive
    : e.endTime ? time(endDate, e.endTime) : { dateTime: new Date(e.startsAt.getTime() + 3600_000).toISOString(), timeZone: e.timezone };

  return {
    id: e.googleEventId,
    status: 'confirmed',
    summary: `${cancelled ? 'CANCELLED: ' : ''}${e.title}`,
    description: lines.join('\n').trim(),
    location: where || `${church.name}, ${fullAddress}`,
    start,
    end,
    recurrence: toRecurrenceLines({ ...e, recurrenceFreq: e.recurrenceFreq, startTime: hhmm(e.startTime), endTime: hhmm(e.endTime) }),
    source: { title: `${church.shortName} website`, url },
    extendedProperties: { private: { npcEventId: e.id, managedBy: 'northminster-cms' } },
    ...(cancelled ? { colorId: '8' } : {}),
  };
}

/** Record that an event changed; it will be pushed to Google. */
export async function markChanged(id: string) {
  await db.update(event).set({
    syncVersion: sql`${event.syncVersion} + 1`,
    syncStatus: 'pending',
    syncAttempts: 0,
    syncNextAttemptAt: new Date(),
    syncError: null,
  }).where(eq(event.id, id));
}

type Outcome = { ok: true; status: EventRow['syncStatus'] } | { ok: false; status: EventRow['syncStatus']; error: string };

/** Reconcile one event with Google. Safe to call any number of times. */
export async function syncEvent(id: string, opts: { force?: boolean } = {}): Promise<Outcome> {
  const now = new Date();
  // Claim the row so two requests can't push the same event at once.
  const [row] = await db.update(event)
    .set({ syncLockedUntil: new Date(now.getTime() + LOCK_SECONDS * 1000) })
    .where(and(eq(event.id, id), or(isNull(event.syncLockedUntil), lt(event.syncLockedUntil, now))))
    .returning();
  if (!row) return { ok: false, status: 'pending', error: 'Another sync for this event is already running.' };

  const claimedVersion = row.syncVersion;
  const wantOnCalendar = shouldBeOnCalendar(row);
  const release = (patch: Partial<EventRow>) =>
    db.update(event).set({ ...patch, syncLockedUntil: null }).where(eq(event.id, id));

  if (!opts.force && row.syncedVersion === claimedVersion && row.syncStatus === 'synced') {
    await release({});
    return { ok: true, status: 'synced' };
  }

  const cfg = calendarConfig();
  if (!cfg) {
    // Never pretend: without credentials nothing was sent.
    const status = wantOnCalendar || row.onCalendar ? 'not_configured' : 'not_applicable';
    await release({ syncStatus: status, syncError: status === 'not_configured' ? 'Google Calendar is not connected yet.' : null });
    return { ok: status === 'not_applicable', status, error: 'Google Calendar is not connected yet.' } as Outcome;
  }

  try {
    let onCalendar = row.onCalendar;
    if (wantOnCalendar) {
      const confirmed = await upsert(cfg, row);
      if (confirmed.id !== row.googleEventId || confirmed.status === 'cancelled') {
        throw new CalendarError('Google did not confirm the event was saved.', 0, true, 'server');
      }
      onCalendar = true;
    } else if (row.onCalendar || row.syncedVersion > 0) {
      await removeFromCalendar(cfg, row.googleEventId);
      onCalendar = false;
    }

    // Only mark synced if nobody changed the event while we were talking to Google.
    const [after] = await db.update(event).set({
      syncedVersion: claimedVersion,
      syncStatus: sql`CASE WHEN ${event.syncVersion} = ${claimedVersion} THEN ${wantOnCalendar || row.syncedVersion > 0 || row.onCalendar ? 'synced' : 'not_applicable'}::calendar_sync_status ELSE 'pending'::calendar_sync_status END`,
      syncError: null,
      syncAttempts: 0,
      syncNextAttemptAt: sql`CASE WHEN ${event.syncVersion} = ${claimedVersion} THEN NULL ELSE now() END`,
      lastSyncedAt: new Date(),
      onCalendar,
      syncLockedUntil: null,
    }).where(eq(event.id, id)).returning({ syncStatus: event.syncStatus });
    if (after?.syncStatus === 'pending') return syncEvent(id);
    return { ok: true, status: after?.syncStatus ?? 'synced' };
  } catch (e) {
    const err = e instanceof CalendarError ? e : new CalendarError((e as Error).message, 0, true, 'server');
    const attempts = row.syncAttempts + 1;
    const delay = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)];
    await release({
      syncStatus: 'error',
      syncError: err.message.slice(0, 1000),
      syncAttempts: attempts,
      // Auth/permission problems need a human; still retry daily in case they're fixed.
      syncNextAttemptAt: new Date(Date.now() + (err.retryable ? delay : 1440) * 60_000),
    });
    return { ok: false, status: 'error', error: err.message };
  }
}

async function upsert(cfg: CalendarConfig, row: EventRow): Promise<GoogleEvent> {
  const body = toGoogleEvent(row);
  try {
    // Update first: it's the common case and works for previously deleted (status=cancelled) events too.
    const updated = await google.update(cfg, row.googleEventId, body);
    if (updated) return updated;
  } catch (e) {
    if (!(e instanceof CalendarError) || (e.kind !== 'not_found' && e.kind !== 'gone')) throw e;
  }
  try {
    const created = await google.insert(cfg, body);
    if (created) return created;
  } catch (e) {
    // A create that succeeded before a timeout shows up as a conflict — update it instead.
    if (e instanceof CalendarError && e.kind === 'conflict') {
      const updated = await google.update(cfg, row.googleEventId, body);
      if (updated) return updated;
    }
    throw e;
  }
  throw new CalendarError('Google returned an empty response.', 0, true, 'server');
}

async function removeFromCalendar(cfg: CalendarConfig, googleId: string) {
  try {
    await google.remove(cfg, googleId);
  } catch (e) {
    if (e instanceof CalendarError && (e.kind === 'not_found' || e.kind === 'gone')) return; // already gone
    throw e;
  }
}

/** Process due syncs (cron + "Sync all"). */
export async function syncDue(limit = 25) {
  const now = new Date();
  const due = await db.select({ id: event.id }).from(event).where(and(
    inArray(event.syncStatus, ['pending', 'error']),
    or(isNull(event.syncNextAttemptAt), lte(event.syncNextAttemptAt, now)),
    or(isNull(event.syncLockedUntil), lt(event.syncLockedUntil, now)),
  )).limit(limit);
  const results = [];
  for (const { id } of due) results.push({ id, ...(await syncEvent(id)) });
  return results;
}

/** After credentials are added: queue everything that was waiting for them. */
export async function queueUnconfigured() {
  const rows = await db.update(event)
    .set({ syncStatus: 'pending', syncNextAttemptAt: new Date(), syncAttempts: 0 })
    .where(eq(event.syncStatus, 'not_configured')).returning({ id: event.id });
  return rows.length;
}

