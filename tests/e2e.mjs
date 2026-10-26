/**
 * End-to-end test of the events CMS against a local dev server + the fake
 * Google Calendar (tests/fake-google.ts). Never touches production.
 *
 *   SET_PASSWORD_LINK=<link from `npm run db:seed`> FIXTURES=<dir> node tests/e2e.mjs
 *
 * Expects the dev server on :4321 started with GOOGLE_CALENDAR_API_BASE=http://localhost:4599.
 */
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const BASE = 'http://localhost:4321';
const GOOGLE = 'http://localhost:4599';
const FIX = process.env.FIXTURES;
const PASSWORD = 'harvest-moon-hymnal-42';
const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(['✔', name]); console.log('✔', name); }
  catch (e) { results.push(['✖', name, e.message]); console.log('✖', name, '\n   ', e.message); }
};
const g = async (path = '/__state', init) => (await fetch(GOOGLE + path, init)).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
page.on('dialog', (d) => d.accept());
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await g('/__reset', { method: 'POST' });

const press = (pg, sel) => pg.$eval(sel, (el) => el.click());
const flash = () => page.$eval('.flash', (el) => el.textContent).catch(() => '');
const cookieHeader = async () => (await page.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
let editUrl = '';
let googleId = '';

await step('Unauthorized visitors are blocked from admin pages and APIs', async () => {
  const r0 = await fetch(`${BASE}/admin`, { redirect: 'manual' });
  assert.equal(r0.status, 302, '/admin must reach the server, not 404');
  assert.match(r0.headers.get('location'), /\/admin\/login/);
  const r1 = await fetch(`${BASE}/admin/events/new`, { redirect: 'manual' });
  assert.equal(r1.status, 302);
  assert.match(r1.headers.get('location'), /\/admin\/login/);
  const r2 = await fetch(`${BASE}/api/admin/events/00000000-0000-0000-0000-000000000000/action`, { method: 'POST', headers: { Origin: BASE, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'action=publish' });
  assert.equal(r2.status, 401);
  const r3 = await fetch(`${BASE}/api/auth/sign-up/email`, { method: 'POST', headers: { Origin: BASE, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'x@y.z', password: 'aaaaaaaaaaaa', name: 'x' }) });
  assert.equal(r3.status, 404, 'public sign-up must not exist');
  const r4 = await fetch(`${BASE}/api/cron/calendar-sync`);
  assert.equal(r4.status, 401);
  const r5 = await fetch(`${BASE}/admin/staff`, { redirect: 'manual' });
  assert.equal(r5.status, 302);
});

await step('Admin sets a password from the one-time link and signs in', async () => {
  await page.goto(process.env.SET_PASSWORD_LINK, { waitUntil: 'networkidle0' });
  assert.match(page.url(), /\/admin\/reset-password\?token=/);
  await page.type('#pw', PASSWORD);
  await page.type('#pw2', PASSWORD);
  await Promise.all([page.waitForNavigation(), page.click('#reset button')]);
  assert.match(await flash(), /Password saved/);
  // The link is single-use.
  await page.goto(process.env.SET_PASSWORD_LINK, { waitUntil: 'networkidle0' });
  assert.match(await page.content(), /expired or was already used/);
  await page.goto(`${BASE}/admin/login`);
  await page.type('#email', 'admin@test.local');
  await page.type('#password', 'wrong-password-123');
  await page.click('#login button');
  await page.waitForFunction(() => !document.getElementById('login-error').hidden);
  await page.$eval('#password', (el) => { el.value = ''; });
  await page.type('#password', PASSWORD);
  await Promise.all([page.waitForNavigation(), page.click('#login button')]);
  assert.match(page.url(), /\/admin\/events/);
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle0' });
  assert.match(page.url(), /\/admin\/events$/, 'signed-in /admin opens the dashboard');
});

await step('Create a draft with an uploaded photo (validation first)', async () => {
  await page.goto(`${BASE}/admin/events/new`, { waitUntil: 'networkidle0' });
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=draft]')]);
  const summary = await page.$eval('#error-summary', (el) => el.textContent);
  assert.match(summary, /title/i);
  assert.match(summary, /date/i);

  await page.type('#title', 'Harvest Potluck');
  await page.type('#summary', 'Bring a dish to share and stay for an afternoon of food and friendship.');
  await page.focus('.rte__editor');
  await page.keyboard.type('Everyone is welcome. ');
  await press(page, '[data-cmd=bold]');
  await page.keyboard.type('Kids eat free.');
  const input = await page.$('#photo-file');
  await input.uploadFile(`${FIX}/test-photo.jpg`);
  await page.waitForFunction(() => document.querySelector('[data-status]').textContent.includes('uploaded'), { timeout: 20000 });
  await page.type('#imageAlt', 'A golden circle on a green background (test image)');
  await page.$eval('#startDate', (el) => { el.value = '2026-11-15'; });
  await page.$eval('#startTime', (el) => { el.value = '12:00'; });
  await page.$eval('#endTime', (el) => { el.value = '14:00'; });
  await page.type('#venue', 'Congdon Hall');
  await page.type('#audience', 'Everyone');
  await page.type('#cost', 'Free — bring a dish');
  await page.type('#details', 'Main dishes A–M\nDesserts N–Z');
  await page.type('#registrationUrl', 'https://example.org/signup');
  await page.type('#registrationLabel', 'Sign up to bring a dish');
  await press(page, 'input[name=featured]');
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=draft]')]);
  assert.match(await flash(), /Draft saved/);
  editUrl = page.url().split('?')[0];
  const state = await g();
  assert.equal(state.events.length, 0, 'drafts must not reach Google Calendar');
});

await step('Preview shows the unsaved event in the public layout', async () => {
  await page.$eval('#summary', (el) => { el.value += ' (preview check)'; });
  const [popup] = await Promise.all([
    new Promise((r) => browser.once('targetcreated', async (t) => r(await t.page()))),
    press(page, '[data-preview-btn]'),
  ]);
  await popup.waitForSelector('#page-title');
  assert.equal(await popup.$eval('#page-title', (el) => el.textContent), 'Harvest Potluck');
  assert.match(await popup.$eval('.preview-bar', (el) => el.textContent), /not saved/);
  assert.match(await popup.content(), /preview check/);
  assert.match(await popup.content(), /<strong>Kids eat free\.<\/strong>/);
  await popup.close();
});

await step('Publish creates exactly one Google Calendar event', async () => {
  await page.goto(editUrl, { waitUntil: 'networkidle0' });
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=publish]')]);
  assert.match(await flash(), /published\. Google Calendar is up to date/);
  const state = await g();
  assert.equal(state.events.length, 1);
  const ev = state.events[0];
  googleId = ev.id;
  assert.match(ev.id, /^npc[0-9a-f]{32}$/);
  assert.equal(ev.summary, 'Harvest Potluck');
  assert.deepEqual(ev.start, { dateTime: '2026-11-15T12:00:00', timeZone: 'America/Los_Angeles' });
  assert.match(ev.location, /Congdon Hall, 4324 Clairemont Mesa Blvd/);
  assert.match(ev.description, /Sign up to bring a dish: https:\/\/example.org\/signup/);
  assert.equal(await page.$eval('.badge--synced', (el) => el.textContent), 'On Google Calendar');
});

await step('Published event appears on /events, its own page, and the homepage', async () => {
  const list = await (await fetch(`${BASE}/events`)).text();
  assert.match(list, /Harvest Potluck/);
  assert.match(list, /"@type":"Event"/);
  const slug = list.match(/href="\/events\/(harvest-potluck-[^"]+)"/)[1];
  const detail = await fetch(`${BASE}/events/${slug}`);
  assert.equal(detail.status, 200);
  const html = await detail.text();
  assert.match(html, /Sign up to bring a dish/);
  assert.match(html, /EventScheduled/);
  const home = await browser.newPage();
  await home.goto(BASE, { waitUntil: 'networkidle0' });
  await home.waitForSelector('.happening__grid', { timeout: 15000 });
  assert.match(await home.$eval('.happening', (el) => el.textContent), /Harvest Potluck/);
  await home.close();
});

await step('Editing updates the same calendar event (no duplicates)', async () => {
  await page.goto(editUrl, { waitUntil: 'networkidle0' });
  await page.$eval('#title', (el) => { el.value = 'Harvest Potluck & Hymn Sing'; });
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=save]')]);
  assert.match(await flash(), /Changes saved\. Google Calendar is up to date/);
  const state = await g();
  assert.equal(state.events.length, 1);
  assert.equal(state.events[0].id, googleId);
  assert.equal(state.events[0].summary, 'Harvest Potluck & Hymn Sing');
  assert.equal(state.log.filter((l) => l.startsWith('POST')).length, 1, 'only one create call ever');
});

await step('Cancelling keeps it listed and labeled on both website and calendar', async () => {
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=cancel_event]')]);
  assert.match(await flash(), /cancelled/);
  const ev = (await g()).events[0];
  assert.match(ev.summary, /^CANCELLED: /);
  assert.equal(ev.status, 'confirmed');
  assert.match(ev.description, /HAS BEEN CANCELLED/);
  const list = await (await fetch(`${BASE}/events`)).text();
  assert.match(list, /This event has been cancelled/);
});

await step('Unpublishing removes it from the website and the calendar', async () => {
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=publish]')]); // un-cancel
  assert.equal((await g()).events[0].summary, 'Harvest Potluck & Hymn Sing');
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=draft]')]);
  assert.match(await flash(), /unpublished/);
  assert.equal((await g()).events[0].status, 'cancelled', 'deleted on Google');
  assert.doesNotMatch(await (await fetch(`${BASE}/events`)).text(), /Hymn Sing/);
  assert.match(await page.$eval('.badge--muted', (el) => el.textContent), /Removed from calendar/);
});

await step('Republishing a previously deleted calendar event revives it (no duplicate)', async () => {
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=publish]')]);
  const state = await g();
  assert.equal(state.events.length, 1);
  assert.equal(state.events[0].status, 'confirmed');
});

await step('A failed sync is recorded honestly and Retry Sync fixes it', async () => {
  await g('/__fail?count=1&status=503', { method: 'POST' });
  await page.$eval('#venue', (el) => { el.value = 'Fellowship Hall'; });
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=save]')]);
  assert.match(await flash(), /Google Calendar update failed/);
  assert.equal(await page.$eval('.badge--error', (el) => el.textContent), 'Calendar sync failed');
  assert.match((await g()).events[0].location, /Congdon Hall/, 'Google still has the old version');
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=retry_sync]')]);
  assert.match(await flash(), /Google Calendar confirmed/);
  assert.match((await g()).events[0].location, /Fellowship Hall/);
});

await step('Permission errors are not retried as if transient, and are explained', async () => {
  await g('/__fail?count=1&status=403', { method: 'POST' });
  await page.$eval('#cost', (el) => { el.value = 'Free'; });
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=save]')]);
  assert.match(await flash(), /can’t edit this calendar|Share the calendar/);
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=retry_sync]')]);
  assert.match(await flash(), /confirmed/);
});

await step('Double-submitting the New Event form creates only one event', async () => {
  const cookie = await cookieHeader();
  const body = new URLSearchParams({ title: 'Double Submit Test', startDate: '2026-12-05', startTime: '09:00', timezone: 'America/Los_Angeles', recurrenceFreq: 'none', intent: 'draft', creationKey: 'dup-test-key-1' });
  const opts = { method: 'POST', redirect: 'manual', headers: { cookie, Origin: BASE, 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() };
  const [a, b] = await Promise.all([fetch(`${BASE}/admin/events/new`, opts), fetch(`${BASE}/admin/events/new`, opts)]);
  assert.equal(a.status, 303); assert.equal(b.status, 303);
  assert.equal(a.headers.get('location').split('?')[0], b.headers.get('location').split('?')[0]);
  const listing = await (await fetch(`${BASE}/admin/events?view=all&q=Double`, { headers: { cookie } })).text();
  assert.equal((listing.match(/class="erow__title"/g) || []).length, 1);
});

await step('Invalid and too-small images are rejected', async () => {
  const cookie = await cookieHeader();
  const up = async (name, type, buf) => {
    const fd = new FormData(); fd.append('file', new Blob([buf], { type }), name);
    return fetch(`${BASE}/api/admin/images`, { method: 'POST', body: fd, headers: { cookie, Origin: BASE, Accept: 'application/json' } });
  };
  const fake = await up('fake.jpg', 'image/jpeg', await readFile(`${FIX}/not-image.jpg`));
  assert.equal(fake.status, 422); assert.match((await fake.json()).error, /readable image/);
  const tiny = await up('tiny.png', 'image/png', await readFile(`${FIX}/tiny.png`));
  assert.equal(tiny.status, 422); assert.match((await tiny.json()).error, /too small/);
  const gif = await up('x.gif', 'image/gif', Buffer.from('GIF89a'));
  assert.equal(gif.status, 422);
});

await step('DST + recurring schedule are sent to Google correctly', async () => {
  const cookie = await cookieHeader();
  const body = new URLSearchParams([
    ['title', 'Fall Back Breakfast'], ['startDate', '2026-11-01'], ['startTime', '10:00'], ['endTime', '11:00'], ['timezone', 'America/Los_Angeles'],
    ['recurrenceFreq', 'weekly'], ['recurrenceByDay', 'SU'], ['recurrenceUntil', '2026-12-20'], ['recurrenceExceptions', '2026-11-29'],
    ['intent', 'publish'], ['creationKey', 'dst-test-1'],
  ]);
  const r = await fetch(`${BASE}/admin/events/new`, { method: 'POST', redirect: 'manual', headers: { cookie, Origin: BASE, 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
  assert.equal(r.status, 303);
  const ev = (await g()).events.find((e) => e.summary === 'Fall Back Breakfast');
  assert.deepEqual(ev.start, { dateTime: '2026-11-01T10:00:00', timeZone: 'America/Los_Angeles' });
  assert.deepEqual(ev.recurrence, ['RRULE:FREQ=WEEKLY;BYDAY=SU;UNTIL=20261221T075959Z', 'EXDATE;TZID=America/Los_Angeles:20261129T100000']);
  const list = await (await fetch(`${BASE}/events`)).text();
  assert.match(list, /Every Sunday/);
});

await step('Duplicate from the dashboard creates a draft copy (not on Google)', async () => {
  await page.goto(`${BASE}/admin/events?view=all&q=Fall%20Back`, { waitUntil: 'networkidle0' });
  await press(page, '.more summary');
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=duplicate]')]);
  assert.match(await flash(), /Copy created as a draft/);
  assert.equal(await page.$eval('#title', (el) => el.value), 'Fall Back Breakfast (copy)');
  assert.equal((await g()).events.filter((e) => e.summary === 'Fall Back Breakfast' && e.status === 'confirmed').length, 1);
});

/** Create + publish an event (optionally with a photo) through the real form endpoint. */
async function createPublished(title, extra = {}, withImage = false) {
  const cookie = await cookieHeader();
  let imageId = '';
  if (withImage) {
    const fd = new FormData(); fd.append('file', new Blob([await readFile(`${FIX}/test-photo.jpg`)], { type: 'image/jpeg' }), 'p.jpg');
    imageId = (await (await fetch(`${BASE}/api/admin/images`, { method: 'POST', body: fd, headers: { cookie, Origin: BASE, Accept: 'application/json' } })).json()).id;
  }
  const body = new URLSearchParams({ title, startDate: '2026-12-02', startTime: '18:00', endTime: '19:00', timezone: 'America/Los_Angeles', recurrenceFreq: 'none', intent: 'publish', creationKey: `k-${title}`, featured: 'on', ...(imageId ? { imageId, imageAlt: 'test photo' } : {}), ...extra });
  const r = await fetch(`${BASE}/admin/events/new`, { method: 'POST', redirect: 'manual', headers: { cookie, Origin: BASE, 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
  const id = r.headers.get('location').match(/events\/([0-9a-f-]{36})\/edit/)[1];
  const slug = (await (await fetch(`${BASE}/events`)).text()).match(new RegExp(`href="/events/(${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}[^"]*)"`))?.[1];
  return { id, slug, imageId };
}
/** Flash message from a 303 redirect (query strings use + for spaces). */
const flashOf = (r) => { const u = new URL(r.headers.get('location'), BASE); return u.searchParams.get('notice') ?? u.searchParams.get('error') ?? ''; };
const purgeReq = (id, cookie, confirm = 'permanent') => fetch(`${BASE}/api/admin/events/${id}/action`, {
  method: 'POST', redirect: 'manual', headers: { cookie, Origin: BASE, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ action: 'purge', ...(confirm ? { confirm } : {}) }).toString(),
});

let purgeTarget = null;
await step('Permanent delete: confirmation dialog, Keep Event, then Delete Permanently (recurring + photo)', async () => {
  purgeTarget = await createPublished('Purge Me Weekly', { recurrenceFreq: 'weekly', recurrenceByDay: 'WE', recurrenceExceptions: '2026-12-23' }, true);
  const gev = (await g()).events.find((e) => e.summary === 'Purge Me Weekly');
  assert.ok(gev && gev.status === 'confirmed' && gev.recurrence[0].startsWith('RRULE:FREQ=WEEKLY'), 'recurring series on Google');
  purgeTarget.googleId = gev.id;
  await page.goto(`${BASE}/admin/events/${purgeTarget.id}/edit`, { waitUntil: 'networkidle0' });
  purgeTarget.imageUrl = await page.$eval('[data-preview-img]', (el) => el.getAttribute('src'));
  assert.equal((await fetch(BASE + purgeTarget.imageUrl)).status, 200);
  const publicBefore = (await (await fetch(`${BASE}/events`)).text()).match(/<li class="erow/g).length;

  // Dialog with the exact copy; "Keep Event" does nothing.
  await press(page, '.danger-zone [data-purge-id]');
  await page.waitForSelector('#purge-dialog[open]');
  const text = await page.$eval('#purge-dialog', (d) => d.textContent.replace(/\s+/g, ' '));
  assert.match(text, /Permanently delete this event\?/);
  assert.match(text, /You’re about to permanently delete “Purge Me Weekly”\. This will remove the event from the website and its connected Google Calendar\. This action cannot be undone\./);
  assert.match(text, /Keep Event/); assert.match(text, /Delete Permanently/);
  await press(page, '[data-purge-cancel]');
  assert.equal(await page.$eval('#purge-dialog', (d) => d.open), false);
  assert.equal((await fetch(`${BASE}/events/${purgeTarget.slug}`)).status, 200, 'kept');

  await press(page, '.danger-zone [data-purge-id]');
  await Promise.all([page.waitForNavigation(), press(page, '#purge-dialog button[value=permanent]')]);
  assert.match(await flash(), /“Purge Me Weekly” was permanently deleted\. It was removed from Google Calendar\./);

  const state = await g();
  assert.equal(state.events.find((e) => e.id === purgeTarget.googleId).status, 'cancelled', 'series deleted on Google');
  assert.ok(state.log.includes(`DELETE ${purgeTarget.googleId}`), 'DELETE sent for the stored calendar id');
  assert.equal(state.events.filter((e) => e.status === 'confirmed' && e.summary !== 'Purge Me Weekly').length >= 1, true, 'other calendar entries untouched');
  assert.equal((await fetch(`${BASE}/events/${purgeTarget.slug}`)).status, 404);
  const listAfter = await (await fetch(`${BASE}/events`)).text();
  assert.doesNotMatch(listAfter, /Purge Me Weekly/);
  assert.equal(listAfter.match(/<li class="erow/g).length, publicBefore - 1, 'other events unaffected');
  const home = await browser.newPage();
  await home.goto(BASE, { waitUntil: 'networkidle0' });
  await home.waitForSelector('.happening__grid', { timeout: 15000 });
  assert.doesNotMatch(await home.$eval('.happening', (el) => el.textContent), /Purge Me Weekly/);
  await home.close();
  assert.equal((await fetch(BASE + purgeTarget.imageUrl)).status, 404, 'unused photo file removed');
  const cookie = await cookieHeader();
  assert.equal(((await (await fetch(`${BASE}/admin/events?view=all&q=Purge%20Me`, { headers: { cookie } })).text()).match(/class="erow__title"/g) || []).length, 0, 'row gone from the database');
});

await step('Repeat / duplicate delete requests are harmless', async () => {
  const r = await purgeReq(purgeTarget.id, await cookieHeader());
  assert.equal(r.status, 303);
  assert.match(flashOf(r), /already deleted/);
});

await step('Background sync and cron can’t recreate a deleted event', async () => {
  await g('/__clearlog', { method: 'POST' });
  const r = await fetch(`${BASE}/api/cron/calendar-sync`, { headers: { authorization: 'Bearer test-cron-secret' } });
  assert.equal(r.status, 200);
  assert.equal((await g()).events.find((e) => e.id === purgeTarget.googleId).status, 'cancelled');
  assert.ok(!(await g()).log.some((l) => l === `PUT ${purgeTarget.googleId}` || l === 'POST'), 'no recreate calls');
});

await step('A shared photo is kept when another event still uses it', async () => {
  const a = await createPublished('Shared Photo A', {}, true);
  const b = await createPublished('Shared Photo B', { imageId: a.imageId, imageAlt: 'same photo' });
  await page.goto(`${BASE}/admin/events/${a.id}/edit`, { waitUntil: 'networkidle0' });
  const url = await page.$eval('[data-preview-img]', (el) => el.getAttribute('src'));
  const r = await purgeReq(a.id, await cookieHeader());
  assert.match(flashOf(r), /permanently deleted/);
  assert.equal((await fetch(BASE + url)).status, 200, 'still used by B');
  assert.equal((await fetch(`${BASE}/events/${b.slug}`)).status, 200);
});

await step('Unconfirmed delete requests do nothing', async () => {
  const t = await createPublished('Not Confirmed');
  const r = await purgeReq(t.id, await cookieHeader(), '');
  assert.match(flashOf(r), /not confirmed/);
  assert.equal((await fetch(`${BASE}/events/${t.slug}`)).status, 200);
});

await step('Failed calendar deletion is queued durably and retried', async () => {
  const t = await createPublished('Calendar Down Test');
  const googleId = (await g()).events.find((e) => e.summary === 'Calendar Down Test').id;
  await g('/__fail?count=1&status=503', { method: 'POST' });
  const r = await purgeReq(t.id, await cookieHeader());
  assert.match(flashOf(r), /queued and will retry/);
  assert.equal((await fetch(`${BASE}/events/${t.slug}`)).status, 404, 'gone from the website immediately');
  assert.equal((await g()).events.find((e) => e.id === googleId).status, 'confirmed', 'still on Google for now');
  await page.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle0' });
  assert.match(await page.content(), new RegExp(`Calendar removals waiting[\\s\\S]*${googleId}`));
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=sync]')]);
  assert.equal((await g()).events.find((e) => e.id === googleId).status, 'cancelled', 'retry removed it');
  assert.doesNotMatch(await page.content(), /Calendar removals waiting/);
});

await step('Unauthenticated and cross-site delete requests are rejected', async () => {
  const t = await createPublished('Security Check Event');
  const anon = await fetch(`${BASE}/api/admin/events/${t.id}/action`, { method: 'POST', headers: { Origin: BASE, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'action=purge&confirm=permanent' });
  assert.equal(anon.status, 401);
  const xsite = await fetch(`${BASE}/api/admin/events/${t.id}/action`, { method: 'POST', headers: { cookie: await cookieHeader(), Origin: 'https://evil.example', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'action=purge&confirm=permanent' });
  assert.equal(xsite.status, 403);
  const get = await fetch(`${BASE}/api/admin/events/${t.id}/action?action=purge&confirm=permanent`, { headers: { cookie: await cookieHeader() } });
  assert.notEqual(get.status, 303);
  assert.equal((await fetch(`${BASE}/events/${t.slug}`)).status, 200, 'still there');
  globalThis.securityEvent = t;
});

let editorLink = '';
await step('Admin invites an Editor; Editors can’t manage staff or settings', async () => {
  await page.goto(`${BASE}/admin/staff`, { waitUntil: 'networkidle0' });
  await page.type('#name', 'Erin Editor');
  await page.type('#email', 'erin@test.local');
  await Promise.all([page.waitForNavigation(), press(page, '.invite button')]);
  editorLink = await page.$eval('#one-time-link', (el) => el.value);
  assert.match(editorLink, /reset-password\//);
  const ctx = await browser.createBrowserContext();
  const p2 = await ctx.newPage();
  await p2.goto(editorLink, { waitUntil: 'networkidle0' });
  await p2.type('#pw', 'editor-password-123'); await p2.type('#pw2', 'editor-password-123');
  await Promise.all([p2.waitForNavigation(), press(p2, '#reset button')]);
  await p2.type('#email', 'erin@test.local'); await p2.type('#password', 'editor-password-123');
  await Promise.all([p2.waitForNavigation(), press(p2, '#login button')]);
  assert.match(p2.url(), /\/admin\/events/);
  const navText = await p2.$eval('.admin-nav', (el) => el.textContent);
  assert.doesNotMatch(navText, /Staff|Settings/);
  const cookie = (await p2.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
  assert.equal((await fetch(`${BASE}/admin/staff`, { headers: { cookie } })).status, 403);
  assert.equal((await fetch(`${BASE}/admin/settings`, { headers: { cookie } })).status, 403);
  const promote = await fetch(`${BASE}/admin/staff`, { method: 'POST', headers: { cookie, Origin: BASE, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'action=role&role=admin&id=x' });
  assert.equal(promote.status, 403);
  // Editors can't permanently delete — no button, and the server refuses.
  await p2.goto(`${BASE}/admin/events?view=all`, { waitUntil: 'networkidle0' });
  assert.equal(await p2.$('[data-purge-id]'), null);
  await p2.goto(`${BASE}/admin/events/${globalThis.securityEvent.id}/edit`, { waitUntil: 'networkidle0' });
  assert.equal(await p2.$('.danger-zone'), null);
  const tryPurge = await purgeReq(globalThis.securityEvent.id, cookie);
  assert.equal(tryPurge.status, 403);
  assert.equal((await fetch(`${BASE}/events/${globalThis.securityEvent.slug}`)).status, 200, 'editor could not delete it');
  await ctx.close();
});

await step('Deactivated staff are signed out and can’t sign back in', async () => {
  await page.goto(`${BASE}/admin/staff`, { waitUntil: 'networkidle0' });
  const people = await page.$$('.person');
  for (const p of people) {
    if ((await p.evaluate((el) => el.textContent)).includes('erin@test.local')) {
      await Promise.all([page.waitForNavigation(), (await p.$('button[value=deactivate]')).evaluate((el) => el.click())]);
      break;
    }
  }
  assert.match(await page.content(), /Account deactivated/);
  const r = await fetch(`${BASE}/api/auth/sign-in/email`, { method: 'POST', headers: { Origin: BASE, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'erin@test.local', password: 'editor-password-123' }) });
  assert.notEqual(r.status, 200);
});

await step('Admin can’t remove the last administrator', async () => {
  await page.goto(`${BASE}/admin/staff`, { waitUntil: 'networkidle0' });
  const html = await page.content();
  assert.match(html, /\(you\)/);
  // The admin's own role select is disabled and has no deactivate button.
  const own = await page.$$eval('.person', (els) => els.find((e) => e.textContent.includes('(you)')).innerHTML);
  assert.doesNotMatch(own, /value="deactivate"/);
});

await step('Settings: test connection + sync all with the (fake) calendar', async () => {
  await page.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle0' });
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=test]')]);
  assert.match(await flash(), /Connected/);
  await Promise.all([page.waitForNavigation(), press(page, 'button[value=sync]')]);
  assert.match(await flash(), /all confirmed by Google|Processed/);
  const seeded = (await g()).events.filter((e) => /Monday Movie Night|Wednesday Family Night|Communion Sunday|Second Sunday/.test(e.summary));
  assert.equal(seeded.length, 4, 'imported recurring events synced after connection');
  assert.ok(seeded.every((e) => Array.isArray(e.recurrence)));
  assert.match(await page.content(), /Recent activity/);
});

await step('Cron endpoint works with the secret', async () => {
  const r = await fetch(`${BASE}/api/cron/calendar-sync`, { headers: { authorization: 'Bearer test-cron-secret' } });
  assert.equal(r.status, 200);
  assert.equal(typeof (await r.json()).processed, 'number');
});

await step('No browser errors during the admin workflow', async () => {
  assert.deepEqual(errors, []);
});

await browser.close();
const failed = results.filter((r) => r[0] === '✖');
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
