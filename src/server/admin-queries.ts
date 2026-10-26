import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { eventImage } from '@/db/schema';

export async function getImageById(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select().from(eventImage).where(eq(eventImage.id, id)).limit(1);
  return row ?? null;
}
