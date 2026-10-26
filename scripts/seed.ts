/**
 * One-time setup: categories, the events that used to be hardcoded in
 * src/content/events.ts, and the first administrator.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" npm run db:seed
 *   (production: add DB_DRIVER=neon STORAGE_DRIVER=blob and load .env.production.local)
 *
 * Safe to re-run: existing categories/events (matched by slug) and users
 * (matched by email) are left untouched — nothing is overwritten.
 */
import { readFile } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/client.ts';
import { event, eventCategory, user } from '../src/db/schema.ts';
import { createEvent, parseEventForm } from '../src/server/events.ts';
import { processAndStore } from '../src/server/images.ts';
import { createPasswordLink } from '../src/server/auth.ts';
import { randomUUID } from 'node:crypto';

const categories = ['Worship', 'Kids & Families', 'Students', 'Adults', 'Community', 'Outreach', 'Special Events'];

const legacy = [
  {
    slugHint: 'parents-night-out-2026-09-25', category: 'Kids & Families', image: 'camp-crafts.jpg',
    imageAlt: 'Kids in matching blue shirts working on craft projects at a long table in the fellowship hall',
    f: { title: 'Parents Night Out', summary: 'Drop the kids off for pizza, crafts, games and a movie. You go enjoy an evening off.', startDate: '2026-09-25', startTime: '18:00', endTime: '20:30', venue: 'Congdon Hall', audience: 'Kids', cost: '$10 per child or $15 per family', details: 'Ages: potty-trained through 5th grade\nPizza, dessert, crafts, games and an age-appropriate movie\nRun by volunteers and leaders from our church\nSpace is limited — register through the church office', registrationRequired: 'on', registrationUrl: 'tel:+18584903995', registrationLabel: 'Call to register', featured: 'on' },
  },
  {
    slugHint: 'monday-movie-night-2026-09-28', category: 'Community', image: null, imageAlt: '',
    f: { title: 'Monday Movie Night', summary: 'A faith-filled movie and good company. Bring a snack to share and meet us in the lounge.', startDate: '2026-09-28', startTime: '17:30', endTime: '19:30', venue: 'The Lounge', audience: 'Everyone', recurrenceFreq: 'weekly', recurrenceByDay: 'MO', featured: 'on' },
  },
  {
    slugHint: 'wednesday-family-night-2026-09-30', category: 'Kids & Families', image: 'kitchen-volunteers.jpg',
    imageAlt: 'Three women laughing together while preparing food in the church kitchen',
    f: { title: 'Wednesday Family Night', summary: 'A home-cooked dinner at 5:30, then Bible study for adults with Pastor Jay and youth groups for kids.', startDate: '2026-09-30', startTime: '17:30', endTime: '19:30', venue: 'Northminster campus', audience: 'All ages', details: 'Dinner is served at 5:30 PM\nAdults: Bible study with the pastor\nKids up to 4th grade: younger kids group\nOlder kids: older kids group', registrationUrl: 'mailto:youth@northminstersandiego.com', registrationLabel: 'Questions? Email Alison', contact: 'youth@northminstersandiego.com', recurrenceFreq: 'weekly', recurrenceByDay: 'WE', featured: 'on' },
  },
  {
    slugHint: 'communion-sunday-2026-10-04', category: 'Worship', image: 'sanctuary-congregation.jpg',
    imageAlt: 'The congregation seated in the sanctuary beneath its tall stained-glass windows',
    f: { title: 'Communion Sunday', summary: 'On the first Sunday of each month we share communion together — and our kids join us for it.', startDate: '2026-10-04', startTime: '10:00', endTime: '11:00', venue: 'Sanctuary', audience: 'Everyone', recurrenceFreq: 'monthly_weekday' },
  },
  {
    slugHint: 'second-sunday-cafe-2026-10-11', category: 'Community', image: 'fall-pumpkins.jpg',
    imageAlt: 'A church volunteer in Minnie Mouse ears helping a young child decorate pumpkins on the lawn',
    f: { title: 'Second Sunday Café', summary: 'Family Fun Sunday: stay after worship for a meal and fellowship. There’s a bounce house for the kids.', startDate: '2026-10-11', startTime: '11:00', endTime: '12:30', venue: 'After the 10 AM service', audience: 'Families', recurrenceFreq: 'monthly_weekday', featured: 'on' },
  },
];

const catIds = new Map<string, string>();
for (const [i, name] of categories.entries()) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
  const [existing] = await db.select().from(eventCategory).where(eq(eventCategory.slug, slug)).limit(1);
  const row = existing ?? (await db.insert(eventCategory).values({ name, slug, sortOrder: i }).returning())[0];
  catIds.set(name, row.id);
}
console.log(`✓ ${categories.length} categories`);

// The first administrator.
const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
let admin = null as null | { id: string; email: string; name: string; role: 'admin' };
if (adminEmail) {
  const [existing] = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
  const id = existing?.id ?? randomUUID();
  if (!existing) await db.insert(user).values({ id, email: adminEmail, name: process.env.ADMIN_NAME ?? 'Administrator', role: 'admin', emailVerified: true });
  admin = { id, email: adminEmail, name: existing?.name ?? process.env.ADMIN_NAME ?? 'Administrator', role: 'admin' };
}
const actor = admin ?? { id: null as unknown as string, email: 'seed', name: 'Seed', role: 'admin' as const };

let imported = 0;
for (const item of legacy) {
  const [exists] = await db.select({ id: event.id }).from(event).where(eq(event.title, item.f.title)).limit(1);
  if (exists) continue;
  const form = new FormData();
  for (const [k, v] of Object.entries(item.f)) form.append(k, v);
  form.append('categoryId', catIds.get(item.category)!);
  if (item.image) {
    const buf = await readFile(`src/assets/photos/${item.image}`);
    const img = await processAndStore(new File([buf], item.image, { type: 'image/jpeg' }), actor.id);
    form.append('imageId', img.id);
    form.append('imageAlt', item.imageAlt);
  }
  const { values, errors } = parseEventForm(form);
  if (Object.keys(errors).length) throw new Error(`${item.f.title}: ${JSON.stringify(errors)}`);
  await createEvent(values, actor as never, 'publish', null);
  imported++;
}
console.log(`✓ ${imported} events imported (${legacy.length - imported} already present)`);

if (admin) {
  const origin = process.env.BETTER_AUTH_URL || 'http://localhost:4321';
  console.log(`\nAdmin: ${admin.email}\nSet your password (one-time link, expires in 3 days):\n${await createPasswordLink(admin.email, origin)}\n`);
} else {
  console.log('\n(No ADMIN_EMAIL given — no administrator created.)');
}
process.exit(0);
