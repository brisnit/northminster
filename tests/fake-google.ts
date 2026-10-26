/**
 * A local stand-in for the Google Calendar v3 events API, used so tests never
 * create real calendar events. Mirrors the behaviors our sync relies on:
 *  - insert with an existing id → 409 (even if that event was deleted)
 *  - update of an unknown id → 404; update can revive a deleted event
 *  - delete → 204, deleting again → 410
 * Control endpoints: POST /__fail?count=N&status=S, GET /__state, POST /__reset, POST /__clearlog
 */
import http from 'node:http';

type Ev = Record<string, unknown> & { id: string; status: string };
const events = new Map<string, Ev>();
const log: string[] = [];
let failNext = 0;
let failStatus = 500;

export function startFakeGoogle(port = 4599) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url!, `http://localhost:${port}`);
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString() || '{}') : null;
    const send = (status: number, data?: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(data === undefined ? '' : JSON.stringify(data));
    };

    if (url.pathname === '/__fail') { failNext = Number(url.searchParams.get('count') ?? 1); failStatus = Number(url.searchParams.get('status') ?? 500); return send(200, { ok: true }); }
    if (url.pathname === '/__state') return send(200, { events: [...events.values()], log });
    if (url.pathname === '/__clearlog') { log.length = 0; return send(200, {}); }
    if (url.pathname === '/__reset') { events.clear(); log.length = 0; failNext = 0; return send(200, {}); }

    if (req.headers.authorization !== 'Bearer test-token') return send(401, { error: { message: 'Invalid Credentials' } });
    const m = url.pathname.match(/^\/calendars\/([^/]+)\/events(?:\/([^/]+))?$/);
    if (!m) return send(404, { error: { message: 'Not Found' } });
    const id = m[2];
    log.push(`${req.method} ${id ?? ''}`.trim());

    if (failNext > 0) { failNext--; return send(failStatus, { error: { message: `Injected failure ${failStatus}` } }); }

    if (req.method === 'GET' && !id) return send(200, { items: [...events.values()].filter((e) => e.status !== 'cancelled').slice(0, 1) });
    if (req.method === 'GET') return events.has(id) ? send(200, events.get(id)) : send(404, { error: { message: 'Not Found' } });
    if (req.method === 'POST') {
      if (!/^[a-v0-9]{5,1024}$/.test(body.id)) return send(400, { error: { message: 'Invalid resource id value.' } });
      if (events.has(body.id)) return send(409, { error: { message: 'The requested identifier already exists.' } });
      const ev = { ...body, status: body.status ?? 'confirmed' };
      events.set(body.id, ev);
      return send(200, ev);
    }
    if (req.method === 'PUT') {
      if (!events.has(id)) return send(404, { error: { message: 'Not Found' } });
      const ev = { ...body, id, status: body.status ?? 'confirmed' };
      events.set(id, ev);
      return send(200, ev);
    }
    if (req.method === 'DELETE') {
      const ev = events.get(id);
      if (!ev) return send(404, { error: { message: 'Not Found' } });
      if (ev.status === 'cancelled') return send(410, { error: { message: 'Resource has been deleted' } });
      ev.status = 'cancelled';
      return send(204);
    }
    send(405, { error: { message: 'Method not allowed' } });
  });
  return new Promise<http.Server>((resolve) => server.listen(port, () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await startFakeGoogle(Number(process.env.PORT ?? 4599));
  console.log('Fake Google Calendar on :4599');
}
