/**
 * Server-side authorization. Every admin endpoint calls requireRole —
 * hiding a button in the UI is never the only protection.
 */
import type { APIContext, AstroGlobal } from 'astro';
import type { Role, SessionUser } from './auth';

export class Forbidden extends Error {}

type Ctx = Pick<APIContext, 'locals'> | Pick<AstroGlobal, 'locals'>;

export function requireRole(ctx: Ctx, role: Role = 'editor'): SessionUser {
  const user = ctx.locals.user;
  if (!user) throw new Forbidden('Please sign in.');
  if (role === 'admin' && user.role !== 'admin') throw new Forbidden('Only administrators can do that.');
  return user;
}

/** Redirect back to `to` with a short flash message in the query string. */
export function back(to: string, msg: string, kind: 'ok' | 'error' = 'ok') {
  const url = new URL(to, 'http://x');
  url.searchParams.set(kind === 'ok' ? 'notice' : 'error', msg);
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search + url.hash } });
}

export function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Wrap an endpoint so auth failures become 401/403 instead of crashes. */
export function guarded<T extends APIContext>(role: Role, fn: (ctx: T, user: SessionUser) => Promise<Response>) {
  return async (ctx: T) => {
    try {
      return await fn(ctx, requireRole(ctx, role));
    } catch (e) {
      if (e instanceof Forbidden) {
        const wantsJson = ctx.request.headers.get('accept')?.includes('application/json');
        if (!ctx.locals.user) return wantsJson ? jsonError(e.message, 401) : ctx.redirect('/admin/login');
        return wantsJson ? jsonError(e.message, 403) : new Response(e.message, { status: 403 });
      }
      throw e;
    }
  };
}
