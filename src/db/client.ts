/**
 * Database connection.
 * - Production (Vercel): Neon serverless Postgres via DATABASE_URL.
 * - Local dev & tests: embedded PGlite in .data/pglite, so development can
 *   never touch production data. Set DB_DRIVER=neon to override deliberately.
 */
import * as schema from './schema';
import { env, isProd } from '../server/env';

type Db = import('drizzle-orm/neon-http').NeonHttpDatabase<typeof schema>;

function useNeon() {
  const driver = env('DB_DRIVER');
  if (driver === 'pglite') return false;
  if (driver === 'neon') return true;
  return isProd() && Boolean(env('DATABASE_URL'));
}

async function create(): Promise<Db> {
  if (isProd() && !env('DATABASE_URL') && env('DB_DRIVER') !== 'pglite') {
    // Never silently fall back to a local database in production.
    return new Proxy({}, { get() { throw new Error('DATABASE_URL is not configured.'); } }) as Db;
  }
  if (useNeon()) {
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-http');
    return drizzle(neon(env('DATABASE_URL')!), { schema });
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const dir = env('PGLITE_DIR') ?? '.data/pglite';
  const g = globalThis as unknown as { __npcPglite?: InstanceType<typeof PGlite> };
  (await import('node:fs')).mkdirSync(dir, { recursive: true });
  g.__npcPglite ??= new PGlite(dir);
  // PGlite and neon-http share the query-builder API we use.
  return drizzle(g.__npcPglite, { schema }) as unknown as Db;
}

const g = globalThis as unknown as { __npcDb?: Promise<Db> };
export const db: Db = await (g.__npcDb ??= create());
export { schema };
