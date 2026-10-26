/**
 * Public event pages are cached briefly at Vercel's edge and tagged so a
 * deletion can purge them immediately. Both calls are no-ops outside Vercel.
 */
export const PUBLIC_EVENTS_TAG = 'npc-public-events';

type HeaderTarget = { headers: Headers };

export async function tagPublicEvents(response: HeaderTarget) {
  response.headers.set('Vercel-Cache-Tag', PUBLIC_EVENTS_TAG);
  try {
    const { addCacheTag } = await import('@vercel/functions');
    await addCacheTag(PUBLIC_EVENTS_TAG);
  } catch { /* not on Vercel */ }
}

/** Remove cached public event pages (and optimized copies of deleted images) right away. */
export async function purgePublicEvents(imageUrls: string[] = []) {
  try {
    const { dangerouslyDeleteByTag, dangerouslyDeleteBySrcImage } = await import('@vercel/functions');
    await dangerouslyDeleteByTag(PUBLIC_EVENTS_TAG);
    if (imageUrls.length) await dangerouslyDeleteBySrcImage(imageUrls);
    return true;
  } catch (e) {
    console.warn('Edge cache purge unavailable; pages expire within ~60s', (e as Error).message);
    return false;
  }
}
