/**
 * Durable Google Calendar removals for permanently deleted events.
 * A job is recorded *before* the event row is deleted, so the calendar id
 * survives even if Google is unreachable. Jobs retry with backoff (and via
 * the daily cron) until Google confirms the event is gone. Deleting the
 * series id removes every occurrence of a recurring event.
 */
import { and, eq, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { calendarDeletion } from '@/db/schema';
import { calendarConfig, CalendarError, google } from './google';

const BACKOFF_MINUTES = [1, 5, 30, 120, 360, 1440];

export async function enqueueCalendarDeletion(googleEventId: string, notBefore = new Date()) {
  await db.insert(calendarDeletion).values({ googleEventId, nextAttemptAt: notBefore })
    .onConflictDoNothing({ target: calendarDeletion.googleEventId });
}

export type DeletionOutcome = { ok: true } | { ok: false; status: 'pending' | 'not_configured' | 'error'; error?: string };

export async function processCalendarDeletion(googleEventId: string): Promise<DeletionOutcome> {
  const now = new Date();
  const [job] = await db.update(calendarDeletion)
    .set({ lockedUntil: new Date(now.getTime() + 60_000) })
    .where(and(eq(calendarDeletion.googleEventId, googleEventId), lte(calendarDeletion.nextAttemptAt, now),
      or(isNull(calendarDeletion.lockedUntil), lt(calendarDeletion.lockedUntil, now))))
    .returning();
  if (!job) {
    const [exists] = await db.select({ id: calendarDeletion.id }).from(calendarDeletion).where(eq(calendarDeletion.googleEventId, googleEventId));
    return exists ? { ok: false, status: 'pending' } : { ok: true };
  }
  const cfg = calendarConfig();
  if (!cfg) {
    await db.update(calendarDeletion).set({ lockedUntil: null, lastError: 'Google Calendar is not connected yet.' }).where(eq(calendarDeletion.id, job.id));
    return { ok: false, status: 'not_configured', error: 'Google Calendar is not connected yet.' };
  }
  try {
    try {
      await google.remove(cfg, googleEventId);
    } catch (e) {
      // Already missing or already deleted on Google = the outcome we want.
      if (!(e instanceof CalendarError && (e.kind === 'not_found' || e.kind === 'gone'))) throw e;
    }
    await db.delete(calendarDeletion).where(eq(calendarDeletion.id, job.id));
    return { ok: true };
  } catch (e) {
    const err = e instanceof CalendarError ? e : new CalendarError((e as Error).message, 0, true, 'server');
    const delay = BACKOFF_MINUTES[Math.min(job.attempts, BACKOFF_MINUTES.length - 1)];
    await db.update(calendarDeletion).set({
      attempts: sql`${calendarDeletion.attempts} + 1`,
      lastError: err.message.slice(0, 1000),
      nextAttemptAt: new Date(Date.now() + (err.retryable ? delay : 1440) * 60_000),
      lockedUntil: null,
    }).where(eq(calendarDeletion.id, job.id));
    return { ok: false, status: 'error', error: err.message };
  }
}

/** Process due removals (cron + Settings → Sync pending events now). */
export async function processDueDeletions(limit = 25, opts: { includeNotDue?: boolean } = {}) {
  const now = new Date();
  if (opts.includeNotDue) await db.update(calendarDeletion).set({ nextAttemptAt: now }).where(or(isNull(calendarDeletion.lockedUntil), lt(calendarDeletion.lockedUntil, now)));
  const due = await db.select({ g: calendarDeletion.googleEventId }).from(calendarDeletion)
    .where(lte(calendarDeletion.nextAttemptAt, now)).limit(limit);
  const results = [];
  for (const { g } of due) results.push({ googleEventId: g, ...(await processCalendarDeletion(g)) });
  return results;
}

export async function pendingDeletions() {
  return db.select().from(calendarDeletion).limit(50);
}
