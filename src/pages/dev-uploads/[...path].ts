import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { isProd } from '@/server/env';
import { LOCAL_UPLOAD_DIR } from '@/server/images';

export const prerender = false;

/** Serves locally stored uploads during development. Disabled in production. */
export const GET: APIRoute = async ({ params }) => {
  const path = params.path ?? '';
  if (isProd() || !/^events\/[0-9a-f-]{36}\.webp$/.test(path)) return new Response('Not found', { status: 404 });
  try {
    return new Response(await readFile(`${LOCAL_UPLOAD_DIR}/${path}`), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=3600' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
