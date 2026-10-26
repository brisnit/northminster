/**
 * Read a server-side setting. Works in all runtimes:
 * Vercel (process.env), Astro dev (.env files via import.meta.env, including
 * `astro dev --mode <name>` → .env.<name>), and Node scripts (process.env).
 */
export function env(key: string): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env[key] : undefined;
  if (fromProcess !== undefined && fromProcess !== '') return fromProcess;
  const meta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const v = meta?.[key];
  return v === '' ? undefined : v;
}

export const isProd = () => (import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD === true;
