import { defineMiddleware } from 'astro:middleware';

/** Admin pages that work without a session. */
const PUBLIC_ADMIN = ['/admin/login', '/admin/reset-password', '/admin/forgot-password'];

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname.replace(/\/$/, '') || '/';
  const isAdmin = path === '/admin' || path.startsWith('/admin/');
  const isAdminApi = path.startsWith('/api/admin/');
  if (!isAdmin && !isAdminApi) return next();

  // Prerendered pages have no request headers; admin is always on-demand.
  const { getSessionUser } = await import('@/server/auth');
  ctx.locals.user = await getSessionUser(ctx.request.headers);

  if (!ctx.locals.user && !PUBLIC_ADMIN.includes(path)) {
    if (isAdminApi) {
      return new Response(JSON.stringify({ error: 'Please sign in.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    return ctx.redirect(`/admin/login?next=${encodeURIComponent(ctx.url.pathname + ctx.url.search)}`);
  }
  if (ctx.locals.user && path === '/admin/login') return ctx.redirect('/admin/events');
  if (path === '/admin') return ctx.redirect('/admin/events');

  let res: Response;
  try {
    res = await next();
  } catch (e) {
    const { Forbidden } = await import('@/server/guard');
    if (!(e instanceof Forbidden)) throw e;
    res = isAdminApi
      ? new Response(JSON.stringify({ error: e.message }), { status: 403, headers: { 'Content-Type': 'application/json' } })
      : new Response(
          `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not allowed</title>` +
          `<body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.5">` +
          `<h1>That page is for administrators</h1><p>${e.message} If you need access, ask a website administrator.</p>` +
          `<p><a href="/admin/events">Back to events</a></p></body>`,
          { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        );
  }
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('Cache-Control', 'private, no-store');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'same-origin');
  return res;
});
