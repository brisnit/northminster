/**
 * Minimal Google Calendar API v3 client (official REST API).
 *
 * Auth: a Google Cloud service account. The church's calendar
 * (northminster4324@gmail.com) is shared with the service account's email
 * with "Make changes to events" permission. Credentials stay server-side
 * in environment variables — see docs/EVENTS-ADMIN.md.
 */
import { JWT } from 'google-auth-library';

import { env } from '../env';

export interface CalendarConfig {
  calendarId: string;
  clientEmail: string;
  privateKey: string;
  apiBase: string;
}

export function calendarConfig(): CalendarConfig | null {
  const calendarId = env('GOOGLE_CALENDAR_ID');
  const clientEmail = env('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKey = env('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  if (!calendarId || !clientEmail || !privateKey) return null;
  return { calendarId, clientEmail, privateKey, apiBase: env('GOOGLE_CALENDAR_API_BASE') ?? 'https://www.googleapis.com/calendar/v3' };
}

/** Which pieces of configuration are present (never the values). */
export function calendarConfigStatus() {
  return {
    calendarId: env('GOOGLE_CALENDAR_ID') ?? null,
    hasServiceAccount: Boolean(env('GOOGLE_SERVICE_ACCOUNT_EMAIL')),
    serviceAccountEmail: env('GOOGLE_SERVICE_ACCOUNT_EMAIL') ?? null,
    hasPrivateKey: Boolean(env('GOOGLE_PRIVATE_KEY')),
  };
}

export class CalendarError extends Error {
  constructor(message: string, public status: number, public retryable: boolean, public kind: 'auth' | 'permission' | 'not_found' | 'conflict' | 'gone' | 'rate_limit' | 'server' | 'invalid' | 'network') {
    super(message);
  }
}

let jwt: JWT | null = null;
let jwtKey = '';

async function accessToken(cfg: CalendarConfig): Promise<string> {
  // Local test double (tests/fake-google.ts) doesn't need real tokens.
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(cfg.apiBase)) return 'test-token';
  if (!jwt || jwtKey !== cfg.clientEmail) {
    jwt = new JWT({ email: cfg.clientEmail, key: cfg.privateKey, scopes: ['https://www.googleapis.com/auth/calendar.events'] });
    jwtKey = cfg.clientEmail;
  }
  try {
    const { token } = await jwt.getAccessToken();
    if (!token) throw new Error('empty token');
    return token;
  } catch (e) {
    jwt = null;
    throw new CalendarError(`Google rejected the service account credentials (${(e as Error).message}). Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.`, 401, false, 'auth');
  }
}

export type GoogleEvent = {
  id: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  summary?: string;
  [k: string]: unknown;
};

async function call(cfg: CalendarConfig, method: string, path: string, body?: unknown): Promise<GoogleEvent | null> {
  const url = `${cfg.apiBase}/calendars/${encodeURIComponent(cfg.calendarId)}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${await accessToken(cfg)}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    if (e instanceof CalendarError) throw e;
    throw new CalendarError(`Couldn't reach Google Calendar (${(e as Error).message}).`, 0, true, 'network');
  }
  if (res.ok) return res.status === 204 ? null : ((await res.json()) as GoogleEvent);

  const text = await res.text();
  let reason = text.slice(0, 300);
  try { reason = JSON.parse(text)?.error?.message ?? reason; } catch { /* keep raw */ }
  const s = res.status;
  if (s === 401) throw new CalendarError(`Google authorization failed: ${reason}`, s, false, 'auth');
  if (s === 403 && /rate|quota/i.test(reason)) throw new CalendarError(`Google rate limit: ${reason}`, s, true, 'rate_limit');
  if (s === 403) throw new CalendarError(`The service account can't edit this calendar. Share the calendar with it ("Make changes to events"). Google said: ${reason}`, s, false, 'permission');
  if (s === 404) throw new CalendarError(`Not found on Google Calendar: ${reason}`, s, false, 'not_found');
  if (s === 409) throw new CalendarError(`Already exists on Google Calendar: ${reason}`, s, false, 'conflict');
  if (s === 410) throw new CalendarError(`Already deleted on Google Calendar: ${reason}`, s, false, 'gone');
  if (s === 429) throw new CalendarError(`Google rate limit: ${reason}`, s, true, 'rate_limit');
  if (s >= 500) throw new CalendarError(`Google Calendar error ${s}: ${reason}`, s, true, 'server');
  throw new CalendarError(`Google Calendar rejected the event (${s}): ${reason}`, s, false, 'invalid');
}

export const google = {
  get: (cfg: CalendarConfig, id: string) => call(cfg, 'GET', `/events/${id}`),
  insert: (cfg: CalendarConfig, ev: GoogleEvent) => call(cfg, 'POST', '/events', ev),
  update: (cfg: CalendarConfig, id: string, ev: GoogleEvent) => call(cfg, 'PUT', `/events/${id}`, ev),
  remove: (cfg: CalendarConfig, id: string) => call(cfg, 'DELETE', `/events/${id}`),
  /** Lightweight permission check used by the Settings page. */
  async check(cfg: CalendarConfig) {
    return call(cfg, 'GET', `/events?maxResults=1&timeMin=${encodeURIComponent(new Date().toISOString())}`);
  },
};
