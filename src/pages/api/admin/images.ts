import type { APIRoute } from 'astro';
import { guarded, jsonError } from '@/server/guard';
import { ImageError, processAndStore } from '@/server/images';
import { audit } from '@/server/events';

export const prerender = false;

export const POST: APIRoute = guarded('editor', async ({ request }, user) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError('Upload failed — the file may be too large (4 MB max).', 413);
  }
  const file = form.get('file');
  if (!(file instanceof File)) return jsonError('Choose an image to upload.');
  try {
    const img = await processAndStore(file, user.id);
    await audit(user, 'image.upload', 'event_image', img.id, { bytes: img.bytes, width: img.width, height: img.height });
    return new Response(JSON.stringify({ id: img.id, url: img.url, width: img.width, height: img.height, focalX: img.focalX, focalY: img.focalY }), {
      status: 201, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    if (e instanceof ImageError) return jsonError(e.message, 422);
    console.error('Image upload failed', e);
    return jsonError('Upload failed. Please try again.', 500);
  }
});
