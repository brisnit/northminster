import type { APIRoute } from 'astro';
import { back, guarded } from '@/server/guard';
import { changeStatus, duplicateEvent, getEventRow, purgeEvent } from '@/server/events';
import { syncEvent } from '@/server/calendar/sync';
import { syncMessage } from '@/server/event-form-handler';

export const prerender = false;

const ACTIONS = ['publish', 'unpublish', 'cancel', 'archive', 'restore', 'duplicate', 'purge', 'retry_sync'] as const;

export const POST: APIRoute = guarded('editor', async (ctx, user) => {
  const id = ctx.params.id ?? '';
  const form = await ctx.request.formData();
  const action = String(form.get('action') ?? '') as (typeof ACTIONS)[number];
  const ref = ctx.request.headers.get('referer');
  const returnTo = ref && new URL(ref).origin === ctx.url.origin && new URL(ref).pathname.startsWith('/admin/') ? new URL(ref).pathname + new URL(ref).search : '/admin/events';
  if (!ACTIONS.includes(action)) return back(returnTo, 'Unknown action.', 'error');

  if (action === 'purge') {
    // Permanent deletion: Admins only, and only from the confirmation dialog.
    if (user.role !== 'admin') return new Response('Only administrators can permanently delete events.', { status: 403 });
    if (form.get('confirm') !== 'permanent') return back(returnTo, 'Deletion was not confirmed. Nothing was deleted.', 'error');
    try {
      const r = await purgeEvent(id, user);
      if (r.alreadyGone) return back('/admin/events', 'That event was already deleted.');
      const cal = !r.calendar ? ''
        : r.calendar.ok ? ' It was removed from Google Calendar.'
        : r.calendar.status === 'not_configured' ? ' (Google Calendar isn’t connected; its removal is queued for when it is.)'
        : ' Removing it from Google Calendar is queued and will retry automatically.';
      return back('/admin/events', `“${r.title}” was permanently deleted.${cal}`);
    } catch (e) {
      console.error('Permanent delete failed', id, e);
      return back(returnTo, 'Something went wrong. The event was not deleted.', 'error');
    }
  }

  const ev = await getEventRow(id);
  if (!ev || ev.deletedAt) return back('/admin/events', 'That event no longer exists.', 'error');

  try {
    switch (action) {
      case 'publish': return back(returnTo, `“${ev.title}” is published.${syncMessage((await changeStatus(id, 'published', user)).sync)}`);
      case 'unpublish': return back(returnTo, `“${ev.title}” is now a draft.${syncMessage((await changeStatus(id, 'draft', user)).sync)}`);
      case 'cancel': return back(returnTo, `“${ev.title}” is marked cancelled.${syncMessage((await changeStatus(id, 'cancelled', user)).sync)}`);
      case 'archive': return back(returnTo, `“${ev.title}” is archived.${syncMessage((await changeStatus(id, 'archived', user)).sync)}`);
      case 'restore': return back(returnTo, `“${ev.title}” restored as a draft.${syncMessage((await changeStatus(id, 'draft', user)).sync)}`);
      case 'duplicate': {
        const newId = await duplicateEvent(id, user);
        return back(`/admin/events/${newId}/edit`, 'Copy created as a draft. Update the date and details, then publish.');
      }
      case 'retry_sync': {
        const r = await syncEvent(id, { force: true });
        return r.ok ? back(returnTo, 'Google Calendar confirmed the update.') : back(returnTo, `Sync still failing: ${(r as { error?: string }).error ?? r.status}`, 'error');
      }
    }
  } catch (e) {
    console.error('Event action failed', action, id, e);
    return back(returnTo, 'Something went wrong. Please try again.', 'error');
  }
});
