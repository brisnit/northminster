/**
 * Event image uploads.
 * Files are verified by decoding them (not by trusting the extension or
 * MIME type), auto-rotated, stripped of metadata (EXIF/GPS), capped at
 * 2400px and stored as WebP. Production storage is Vercel Blob; local dev
 * writes to .data/uploads/ (served by /dev-uploads/, dev only).
 */
import sharp, { type Metadata } from 'sharp';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { eventImage } from '@/db/schema';
import { env, isProd } from './env';

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // under Vercel's 4.5 MB request limit
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const MIN_DIMENSION = 600;
export const LOCAL_UPLOAD_DIR = '.data/uploads';
const MAX_DIMENSION = 2400;

export class ImageError extends Error {}

/** Vercel Blob in production (or when STORAGE_DRIVER=blob); local files otherwise. */
const useBlob = () => Boolean(env('BLOB_READ_WRITE_TOKEN')) && (env('STORAGE_DRIVER') === 'blob' || (isProd() && env('STORAGE_DRIVER') !== 'local'));

export async function processAndStore(file: File, userId: string) {
  if (!file || file.size === 0) throw new ImageError('Choose an image to upload.');
  if (file.size > MAX_UPLOAD_BYTES) throw new ImageError('That image is larger than 4 MB. Try a smaller photo.');
  if (file.type && !ACCEPTED_TYPES.includes(file.type)) throw new ImageError('Please upload a JPG, PNG or WebP image.');

  const input = Buffer.from(await file.arrayBuffer());
  let meta: Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new ImageError('That file isn’t a readable image.');
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) throw new ImageError('Please upload a JPG, PNG or WebP image.');
  if ((meta.pages ?? 1) > 1) throw new ImageError('Animated images aren’t supported.');
  const w = meta.autoOrient?.width ?? meta.width ?? 0;
  const h = meta.autoOrient?.height ?? meta.height ?? 0;
  if (Math.min(w, h) < MIN_DIMENSION) throw new ImageError(`That image is too small (${w}×${h}). Use one at least ${MIN_DIMENSION}px on its shortest side so it looks sharp.`);

  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const key = `events/${randomUUID()}.webp`;
  let url: string;
  if (useBlob()) {
    const { put } = await import('@vercel/blob');
    const blob = await put(key, data, { access: 'public', contentType: 'image/webp', addRandomSuffix: false });
    url = blob.url;
  } else {
    // Local development only: kept outside public/ (Vite would reload the page on every upload).
    const fs = await import('node:fs/promises');
    await fs.mkdir(`${LOCAL_UPLOAD_DIR}/events`, { recursive: true });
    await fs.writeFile(`${LOCAL_UPLOAD_DIR}/${key}`, data);
    url = `/dev-uploads/${key}`;
  }

  const [row] = await db.insert(eventImage).values({
    url, storageKey: key, width: info.width, height: info.height, bytes: info.size, mimeType: 'image/webp', uploadedBy: userId,
  }).returning();
  return row;
}

export async function setFocalPoint(id: string, x: number, y: number) {
  const clamp = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0.5));
  await db.update(eventImage).set({ focalX: clamp(x), focalY: clamp(y) }).where(eq(eventImage.id, id));
}

/** Delete an image file + row (only when no event references it). */
export async function deleteImage(id: string) {
  const [row] = await db.delete(eventImage).where(eq(eventImage.id, id)).returning();
  if (!row) return;
  try {
    if (row.url.startsWith('http') && env('BLOB_READ_WRITE_TOKEN')) {
      const { del } = await import('@vercel/blob');
      await del(row.url);
    } else if (row.url.startsWith('/dev-uploads/')) {
      await (await import('node:fs/promises')).rm(`${LOCAL_UPLOAD_DIR}/${row.storageKey}`, { force: true });
    }
  } catch (e) {
    console.error('Image file cleanup failed', row.storageKey, e);
  }
}
