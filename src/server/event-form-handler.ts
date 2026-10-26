/** Shared POST handling for the New / Edit event pages. */
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { event, eventImage } from '@/db/schema';
import type { SessionUser } from './auth';
import { changeStatus, createEvent, parseEventForm, updateEvent, type Intent } from './events';
import { deleteImage, setFocalPoint } from './images';

export function syncMessage(sync: { ok: boolean; status: string; error?: string } | null | undefined) {
  if (!sync) return '';
  if (sync.ok && sync.status === 'synced') return ' Google Calendar is up to date.';
  if (sync.status === 'not_configured') return ' (Google Calendar isn’t connected yet, so the calendar wasn’t changed.)';
  if (!sync.ok) return ` But the Google Calendar update failed — it will retry automatically, or use “Retry sync”. (${sync.error})`;
  return '';
}

async function imageExists(id: string | null) {
  if (!id) return true;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const [row] = await db.select({ id: eventImage.id }).from(eventImage).where(eq(eventImage.id, id)).limit(1);
  return Boolean(row);
}

/** Remove an image that no event uses anymore. */
async function cleanupImage(oldId: string | null, newId: string | null) {
  if (!oldId || oldId === newId) return;
  const [inUse] = await db.select({ id: event.id }).from(event).where(eq(event.imageId, oldId)).limit(1);
  if (!inUse) await deleteImage(oldId);
}

export async function handleEventPost(form: FormData, user: SessionUser, existing: { id: string; imageId: string | null; status: string } | null) {
  const { values, errors } = parseEventForm(form);
  const raw = String(form.get('intent') ?? 'draft');
  const intent = (['draft', 'publish', 'save', 'cancel_event'].includes(raw) ? raw : 'draft') as Intent | 'cancel_event';
  if (!(await imageExists(values.imageId))) { values.imageId = null; errors.imageId = 'That photo is no longer available. Please upload it again.'; }
  if (Object.keys(errors).length) return { ok: false as const, values, errors };

  const focalX = Number(form.get('focalX')); const focalY = Number(form.get('focalY'));
  if (values.imageId) await setFocalPoint(values.imageId, focalX, focalY);

  if (!existing) {
    const key = String(form.get('creationKey') ?? '').slice(0, 64) || null;
    const res = await createEvent(values, user, intent === 'publish' ? 'publish' : 'draft', key);
    const what = res.duplicate ? 'Already saved.' : intent === 'publish' ? 'Event published.' : 'Draft saved.';
    return { ok: true as const, id: res.id, message: what + syncMessage(res.sync) };
  }

  const res = await updateEvent(existing.id, values, user, intent === 'cancel_event' ? 'save' : (intent as Intent));
  let sync = res.sync;
  if (intent === 'cancel_event') sync = (await changeStatus(existing.id, 'cancelled', user)).sync ?? sync;
  await cleanupImage(existing.imageId, values.imageId);
  const msg = intent === 'publish' ? (existing.status === 'cancelled' ? 'Event republished.' : 'Event published.')
    : intent === 'draft' ? (existing.status === 'published' ? 'Event unpublished — it’s now a draft.' : 'Draft saved.')
    : intent === 'cancel_event' ? 'Event marked as cancelled.'
    : 'Changes saved.';
  return { ok: true as const, id: existing.id, message: msg + syncMessage(sync) };
}
