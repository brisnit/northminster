# Events admin guide

This guide covers the church website's event system: how staff add events, and how they show up on the website and on Google Calendar.

- **Staff:** read *Part 1*. It takes about five minutes.
- **Administrators:** read *Parts 1–2*.
- **Developers:** read *Part 3*.

---

## Part 1 — For staff: adding an event

**Sign in:** go to **/admin/login** on the church website (for example `https://northminsterclairmont.org/admin/login`).

### Create an event (about 3 minutes)
1. Choose **+ New event**.
2. Fill in the **title** and **start date**. Those are the only required fields. Add a start time, or tick **All-day event**.
3. Add a **short description**. This is the one or two sentences people see on event cards.
4. **Add a photo.** Drag it into the box, or choose a file. Phone photos are fine; they are resized automatically.
   - Click the most important part of the photo (usually faces). That spot stays in view when the photo is cropped.
   - Fill in **Describe the photo**, for example "Kids painting at a craft table in Congdon Hall". People using screen readers hear this description, so it's required whenever there's a photo.
5. Add **where**, **who it's for** and **cost**. Then add any **bullet points**, one per line.
6. If people need to sign up, tick **Registration required**. Then add the link and a button label. A phone link like `tel:+18584903995` works too.
7. Press **Preview** to see exactly how the page will look. It opens in a new tab, and nothing is saved yet.
8. Press **Publish**. You can also press **Save draft** to finish later.

Published events appear on the **Events** page right away, and the homepage updates within about a minute. When Google Calendar is connected, the event also appears there.

### Repeating events
Under **Repeats**, choose one of:
- **Weekly:** pick the days.
- **Monthly, same weekday:** for example "second Sunday".
- **Monthly, same date:** for example "the 15th".

You can also:
- Add a **Last date** if the series stops (for example, before the summer break).
- Use **Skip these dates** for holidays, written like `2026-11-25, 2026-12-23`.

### Changing, cancelling or removing an event
| You want to… | Do this | Website | Google Calendar |
| --- | --- | --- | --- |
| Fix a typo or change details | Edit, then **Update live event** | Updated | Updated |
| Call it off but let people know | **Cancel event** | Stays listed, marked **Cancelled** | Title becomes "CANCELLED: …" |
| Take it down for now | **Unpublish** | Hidden | Removed |
| Put it away (keep a record) | More → **Archive** | Hidden | Removed |
| Get rid of it forever (**Admins only**) | More → **Delete permanently…**, or **Danger zone** on the edit page | Removed; its page returns “not found” | Removed (whole series, if repeating) |
| Make a similar event | More → **Duplicate**, then change the date | New draft | Nothing until you publish |

**Featured** events get first place in the homepage's "What's happening" section. Past events drop off automatically.

### What the calendar labels mean
- **On Google Calendar:** Google confirmed it has the latest version.
- **Calendar update pending:** the change is waiting to be sent.
- **Calendar sync failed:** Google didn't accept the last change. Press **Retry sync**. If it keeps failing, tell an administrator. It also retries automatically once a day.
- **Calendar not connected:** Google Calendar isn't set up yet. The website still works normally.
- **Not on calendar / Removed from calendar:** drafts, archived and deleted events.

### Forgot your password?
Ask an administrator to press **Reset password** next to your name in **Staff**. They'll send you a link that works once and expires in 3 days.

---

## Part 2 — For administrators

### Staff
- Go to **Staff**, then **Invite someone**: enter their name, email and role. You'll get a one-time **invite link**. Copy it and send it to them by text or email. It expires in 3 days.
- **Editor:** can create, edit, publish and delete events.
- **Administrator:** can also manage staff and settings.
- **Reset password:** gives you a new one-time link to send to them.
- **Deactivate:** signs the person out everywhere and blocks sign-in. You can reactivate them later.
- Safety rules:
  - You can't remove your own admin access or deactivate yourself.
  - There must always be at least one active administrator.

There is no public sign-up. The only way in is an invite from an administrator.

### Permanent deletion
Only administrators can permanently delete. A confirmation box explains what will happen; choose **Delete Permanently** to proceed or **Keep Event** to back out. The event and its photo (unless another event uses it) are erased, cached pages are cleared, and the Google Calendar entry is removed. The activity log keeps only who deleted which event, and when. If Google Calendar is unreachable, the removal is saved and retried automatically (Settings lists any still waiting). Editors can still Unpublish or Archive.

### Settings
Settings shows the Google Calendar connection, with **Test connection** and **Sync pending events now** buttons. It also has a log of recent activity: who created, published, changed or deleted what.

### Connecting Google Calendar (one-time, about 15 minutes)
The website writes to the church's existing calendar, **northminster4324@gmail.com**. It uses a Google Cloud *service account*: a robot account that the calendar is shared with.

1. Go to <https://console.cloud.google.com/> and sign in with any Google account the church controls.
2. Create a project (e.g. "Northminster website").
3. Go to **APIs & Services → Library**, find **Google Calendar API** and choose **Enable**.
4. Go to **IAM & Admin → Service Accounts → Create service account** and name it "website-calendar". It doesn't need any roles.
5. Open the new service account, then go to **Keys → Add key → Create new key → JSON**. A file downloads. **Treat it like a password.**
6. Sign in to <https://calendar.google.com> as **northminster4324@gmail.com**. Go to **Settings**, choose that calendar, then **Share with specific people → Add people**. Paste the service account's email (it ends in `iam.gserviceaccount.com`) and choose **Make changes to events**.
7. In Vercel, open the **northminster** project, then **Settings → Environment Variables**. Add these for **Production**:
   - `GOOGLE_CALENDAR_ID` = `northminster4324@gmail.com`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = the `client_email` from the JSON file
   - `GOOGLE_PRIVATE_KEY` = the `private_key` from the JSON file. Paste the whole value, including `-----BEGIN PRIVATE KEY-----`.
8. **Redeploy** (Deployments → ⋯ → Redeploy).
9. In the website admin, go to **Settings** and press **Test connection**. Then press **Sync pending events now**. Events published before the connection existed are sent then.
10. Delete the downloaded JSON file once the key is saved in Vercel.

**Existing calendar events are never touched.** The website only creates, changes or removes events it created itself; each one is tagged with `managedBy: northminster-cms`. The 30 older entries on that calendar (2019–2021) are left exactly as they are. Importing them would need a separate decision about who owns them.

---

## Part 3 — Technical reference

### Architecture
| Concern | Implementation |
| --- | --- |
| Hosting | Vercel (`@astrojs/vercel`). Existing pages are still prerendered. On demand: `/events`, `/events/[slug]`, the homepage events server island, `/admin/*`, `/api/*` |
| Database | Neon Postgres (Vercel Marketplace, `pdx1`) via Drizzle ORM. Local dev/tests use embedded PGlite in `.data/` and never touch production |
| Auth | Better Auth: email + password, sign-up disabled, admin plugin roles (`admin`/`editor`), 7-day sessions, rate-limited sign-in, sessions revoked on password reset and on deactivation |
| Authorization | `src/middleware.ts` (session required for `/admin`, `/api/admin`) plus `requireRole` / `guarded` in every page and endpoint. Better Auth's public routes are allow-listed (`src/pages/api/auth/[...all].ts`). Astro `checkOrigin` blocks cross-site form posts |
| Images | Verified by decoding with sharp; EXIF/GPS stripped; max 2400px WebP; stored in Vercel Blob; delivered through Vercel Image Optimization. 4:3 crops use the stored focal point |
| Calendar | Google Calendar API v3, service account (`src/server/calendar/`) |
| Cache | Public event pages: `s-maxage=60, stale-while-revalidate=600`. Admin: `private, no-store` + `noindex` |

### Calendar sync design
- **Source of truth:** the CMS, for events it creates. Sync is one-way (CMS → Google).
- **Idempotency:** Google event id = `npc` + the event's UUID (hex is valid base32hex), so a retried create can't make a duplicate:
  - A "409 already exists" response becomes an update.
  - Updating a previously deleted event revives it.
- **Versioning:** every calendar-relevant change bumps `sync_version`. A sync records `synced_version` only when Google returns the event with the expected id. If the event changed during the call, the result goes back to `pending` and syncs again.
- **Locking:** `sync_locked_until` prevents two requests from pushing the same event at once.
- **Policy:**

  | Event state | Google Calendar |
  | --- | --- |
  | published | event confirmed |
  | cancelled | confirmed, titled `CANCELLED: …` |
  | draft / archived | removed (DELETE; 404/410 count as already gone) |
  | permanently deleted | removed via the durable `calendar_deletion` queue (recorded before the row is deleted; the sync engine never recreates a missing row) |

- **Failures:** the error text is stored in `sync_error`.
  - Network errors, 5xx and 429 retry with backoff of 1 min → 5 min → 30 min → 2 h → 6 h → 24 h.
  - Auth (401) and permission (403) problems need a human, so they retry daily and the cause is shown to staff.
  - Retry paths: **Retry sync** (per event), **Sync pending events now** (Settings), and a daily Vercel Cron (`/api/cron/calendar-sync`, `Authorization: Bearer $CRON_SECRET`).
- **Not configured:** with no credentials, events get the status `not_configured`, nothing is sent, and the UI says so. Adding credentials and pressing "Sync pending events now" sends them.
- **Recurrence:**
  - Rules are sent as RFC 5545 `RRULE`, with `UNTIL` in UTC and skipped dates as `EXDATE;TZID=…`.
  - Editing a rule replaces the whole series on Google.
  - Changing a single occurrence (rather than skipping it) is not supported. Use a skipped date plus a separate one-off event.

### Database
- **Schema:** `src/db/schema.ts`. Tables: `event`, `event_image`, `event_category`, `audit_log`, plus Better Auth's `user`, `session`, `account`, `verification`.
- **Migrations:** live in `drizzle/`.
- **Indexes:** public listing (`status, starts_at`), series end, sync queue, unique slug, Google id and creation key.
- **Times:** stored twice. The wall-clock values as entered (`start_date`, `start_time`, `timezone`) are the source of truth for display, and they're DST-safe. The resolved instants (`starts_at`, `ends_at`, `series_ends_at`) are used for querying.
- **Deleting:** soft (`deleted_at`). The row is kept so the calendar entry can be removed, and for the audit trail.
- **Double-submit protection:** the New Event form carries a one-time `creation_key` (unique), and buttons disable on submit.

### Environment variables (Vercel → Production)
| Variable | Purpose |
| --- | --- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (+ `PG*`/`POSTGRES_*`) | Neon. Set automatically by the integration |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob. Set automatically |
| `BETTER_AUTH_SECRET` | Random 32+ bytes. Signs sessions. Rotating it signs everyone out |
| `BETTER_AUTH_URL` | `https://northminsterclairmont.org` |
| `PUBLIC_SITE_URL` | Used for links inside calendar events |
| `CRON_SECRET` | Protects the daily sync endpoint (Vercel sends it automatically) |
| `GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` | Calendar (Part 2) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional. Emails invite/reset links in addition to showing them |

### Commands
```bash
npm run dev                 # local site + admin on PGlite (.data/pglite)
npm run db:generate         # after editing src/db/schema.ts → new migration in drizzle/
npm run db:migrate          # apply migrations locally
npm run db:migrate -- --prod  # apply to production (needs .env.production.local: `vercel env pull .env.production.local --environment=production`)
ADMIN_EMAIL=… ADMIN_NAME="…" npm run db:seed   # categories, imported events, first admin + set-password link
npm test                    # unit tests (time zones, DST, recurrence)
FIXTURES=<dir> npm run test:e2e   # full browser workflow against local DB + fake Google Calendar
```

The E2E suite (`tests/e2e.mjs`) uses `tests/fake-google.ts` instead of the real calendar. Tests never create real Google Calendar events.
