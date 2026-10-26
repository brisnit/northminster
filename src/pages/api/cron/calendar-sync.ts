import type { APIRoute } from 'astro';
import { timingSafeEqual } from 'node:crypto';
import { syncDue } from '@/server/calendar/sync';
import { processDueDeletions } from '@/server/calendar/deletions';
import { env } from '@/server/env';

export const prerender = false;

/** Daily retry of pending/failed calendar syncs (Vercel Cron, see vercel.json). */
export const GET: APIRoute = async ({ request }) => {
  const secret = env('CRON_SECRET');
  const given = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (!secret || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return new Response('Unauthorized', { status: 401 });
  }
  const results = await syncDue(50);
  const removals = await processDueDeletions(50);
  return new Response(JSON.stringify({
    processed: results.length, failed: results.filter((r) => !r.ok).length,
    removals: removals.length, removalsFailed: removals.filter((r) => !r.ok).length,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
