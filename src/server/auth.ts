/**
 * Staff authentication (Better Auth): email + password, no public sign-up.
 * Roles: 'admin' (manages staff & settings) and 'editor' (manages events).
 * Invites and password resets produce single-use links an Admin shares;
 * if RESEND_API_KEY is set they are also emailed.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins/admin';
import { db, schema } from '@/db/client';

export type Role = 'admin' | 'editor';
export const RESET_PATH = '/admin/reset-password';
const INVITE_LINK_TTL = 60 * 60 * 24 * 3; // 3 days

/** Links captured for an Admin who asked for one (keyed by email). */
const captured = new Map<string, string>();
const expectingCapture = new Set<string>();

import { env, isProd } from './env';

const origins = [
  env('BETTER_AUTH_URL'),
  'https://northminsterclairmont.org', 'https://www.northminsterclairmont.org',
  'https://npcsd.org', 'https://www.npcsd.org',
  'https://northminstersandiego.org', 'https://www.northminstersandiego.org',
  'https://northminstersandiego.com', 'https://www.northminstersandiego.com',
  env('VERCEL_URL') ? `https://${env('VERCEL_URL')}` : undefined,
].filter(Boolean) as string[];

export const auth = betterAuth({
  secret: env('BETTER_AUTH_SECRET'),
  baseURL: env('BETTER_AUTH_URL'),
  basePath: '/api/auth',
  trustedOrigins: origins,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: INVITE_LINK_TTL,
    async sendResetPassword({ user, url }) {
      const email = user.email.toLowerCase();
      if (expectingCapture.has(email)) captured.set(email, url);
      await maybeEmail(user.email, 'Set your Northminster website password', url);
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily while active
  },
  rateLimit: { enabled: isProd(), window: 60, max: 30 },
  advanced: { useSecureCookies: isProd() },
  plugins: [admin({ defaultRole: 'editor', adminRoles: ['admin'] })],
});

/** Ask Better Auth for a password-set link for `email`, returning the URL. */
export async function createPasswordLink(email: string, origin: string): Promise<string> {
  const key = email.toLowerCase();
  expectingCapture.add(key);
  try {
    await auth.api.requestPasswordReset({ body: { email, redirectTo: new URL(RESET_PATH, origin).href } });
    const url = captured.get(key);
    if (!url) throw new Error('No account with that email.');
    return url;
  } finally {
    expectingCapture.delete(key);
    captured.delete(key);
  }
}

async function maybeEmail(to: string, subject: string, url: string) {
  const key = env('RESEND_API_KEY');
  const from = env('EMAIL_FROM');
  if (!key || !from) return;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to, subject,
      text: `Use this link to set your password for the Northminster website admin. It expires in 3 days and works once.\n\n${url}\n\nIf you weren't expecting this, you can ignore it.`,
    }),
  });
  if (!res.ok) console.error('Email send failed', res.status, await res.text());
}

export type SessionUser = { id: string; email: string; name: string; role: Role };

export async function getSessionUser(headers: Headers): Promise<SessionUser | null> {
  const s = await auth.api.getSession({ headers });
  if (!s?.user || (s.user as { banned?: boolean }).banned) return null;
  const role = ((s.user as { role?: string }).role === 'admin' ? 'admin' : 'editor') as Role;
  return { id: s.user.id, email: s.user.email, name: s.user.name, role };
}
