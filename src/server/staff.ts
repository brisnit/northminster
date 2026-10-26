/** Staff accounts (Admin-only operations; callers must check role). */
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '@/db/client';
import { account, session, user } from '@/db/schema';
import { createPasswordLink, type Role, type SessionUser } from './auth';
import { audit } from './events';

export class StaffError extends Error {}

export async function listStaff() {
  return db.select({
    id: user.id, name: user.name, email: user.email, role: user.role, banned: user.banned, createdAt: user.createdAt,
    hasPassword: sql<boolean>`exists(select 1 from ${account} where ${account.userId} = ${user.id} and ${account.providerId} = 'credential')`,
  }).from(user).orderBy(asc(user.name));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Create an account and return a one-time "set your password" link. */
export async function inviteStaff(actor: SessionUser, input: { name: string; email: string; role: Role }, origin: string) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim().slice(0, 100);
  if (!name) throw new StaffError('Enter their name.');
  if (!EMAIL.test(email)) throw new StaffError('Enter a valid email address.');
  const [exists] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (exists) throw new StaffError('Someone with that email already has an account. Use “Reset password” to send them a new link.');
  const id = randomUUID();
  await db.insert(user).values({ id, name, email, role: input.role === 'admin' ? 'admin' : 'editor', emailVerified: true });
  await audit(actor, 'staff.invite', 'user', id, { email, role: input.role });
  return createPasswordLink(email, origin);
}

export async function resetLink(actor: SessionUser, userId: string, origin: string) {
  const [u] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!u) throw new StaffError('That account no longer exists.');
  await audit(actor, 'staff.reset_link', 'user', userId, { email: u.email });
  return createPasswordLink(u.email, origin);
}

async function otherActiveAdmins(excludeId: string) {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(user)
    .where(and(eq(user.role, 'admin'), ne(user.id, excludeId), eq(user.banned, false)));
  return r?.n ?? 0;
}

export async function setRole(actor: SessionUser, userId: string, role: Role) {
  if (userId === actor.id && role !== 'admin') throw new StaffError('You can’t remove your own admin access. Ask another admin.');
  if (role !== 'admin' && (await otherActiveAdmins(userId)) === 0) throw new StaffError('There must always be at least one administrator.');
  await db.update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, userId));
  await audit(actor, 'staff.set_role', 'user', userId, { role });
}

export async function setActive(actor: SessionUser, userId: string, active: boolean) {
  if (userId === actor.id) throw new StaffError('You can’t deactivate your own account.');
  if (!active && (await otherActiveAdmins(userId)) === 0) throw new StaffError('There must always be at least one active administrator.');
  await db.update(user).set({ banned: !active, banReason: active ? null : 'Deactivated by an administrator', updatedAt: new Date() }).where(eq(user.id, userId));
  if (!active) await db.delete(session).where(eq(session.userId, userId)); // sign them out everywhere
  await audit(actor, active ? 'staff.reactivate' : 'staff.deactivate', 'user', userId);
}
