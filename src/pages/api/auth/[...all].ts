import type { APIRoute } from 'astro';
import { auth } from '@/server/auth';

export const prerender = false;

/**
 * Only these Better Auth endpoints are reachable from the browser.
 * Account creation, role changes etc. happen server-side in /admin/staff,
 * behind our own Admin checks — never through public endpoints.
 */
const ALLOWED = new Set([
  'sign-in/email', 'sign-out', 'get-session', 'reset-password', 'change-password', 'ok',
]);

export const ALL: APIRoute = async ({ request, params }) => {
  const path = params.all ?? '';
  // reset-password/<token> is the link target that validates the token, then redirects.
  if (!ALLOWED.has(path) && !/^reset-password\/[\w-]+$/.test(path)) return new Response('Not found', { status: 404 });
  return auth.handler(request);
};
