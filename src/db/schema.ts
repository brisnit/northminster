/**
 * Database schema (Drizzle ORM → Postgres).
 *
 * Auth tables (user/session/account/verification) follow Better Auth's
 * model; property names must stay camelCase because Better Auth reads them.
 * Everything else is the church events CMS.
 *
 * Change this file, then run `npm run db:generate` to create a migration.
 */
import { sql } from 'drizzle-orm';
import {
  boolean, date, index, integer, jsonb, pgEnum, pgTable, real, text, time, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core';

/* ------------------------------------------------------------------ */
/* Auth (Better Auth + admin plugin)                                  */
/* ------------------------------------------------------------------ */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  /** 'admin' | 'editor' */
  role: text('role').default('editor'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  impersonatedBy: text('impersonated_by'),
}, (t) => [index('session_user_idx').on(t.userId)]);

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('account_user_idx').on(t.userId)]);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('verification_identifier_idx').on(t.identifier)]);

/* ------------------------------------------------------------------ */
/* Events CMS                                                         */
/* ------------------------------------------------------------------ */

export const eventStatus = pgEnum('event_status', ['draft', 'published', 'cancelled', 'archived']);

/**
 * Calendar sync state for one event.
 * - not_applicable: nothing needs to exist on Google (e.g. a draft never published)
 * - not_configured: Google credentials aren't set up, so nothing was attempted
 * - pending: a change is waiting to be pushed
 * - synced: Google confirmed the latest version
 * - error: the last attempt failed (see sync_error); retried automatically
 */
export const syncStatus = pgEnum('calendar_sync_status', ['not_applicable', 'not_configured', 'pending', 'synced', 'error']);

export const recurrenceFreq = pgEnum('recurrence_freq', ['none', 'weekly', 'monthly_weekday', 'monthly_date']);

export const eventCategory = pgTable('event_category', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const eventImage = pgTable('event_image', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Public URL of the processed (EXIF-stripped, resized) original. */
  url: text('url').notNull(),
  /** Storage key/pathname, used to delete the file. */
  storageKey: text('storage_key').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  bytes: integer('bytes').notNull(),
  mimeType: text('mime_type').notNull(),
  /** Focal point (0–1) used for consistent cropping. */
  focalX: real('focal_x').notNull().default(0.5),
  focalY: real('focal_y').notNull().default(0.5),
  uploadedBy: text('uploaded_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const event = pgTable('event', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  /** Sanitized HTML from the rich-text editor. */
  descriptionHtml: text('description_html').notNull().default(''),
  categoryId: uuid('category_id').references(() => eventCategory.id, { onDelete: 'set null' }),
  imageId: uuid('image_id').references(() => eventImage.id, { onDelete: 'set null' }),
  imageAlt: text('image_alt').notNull().default(''),

  // Wall-clock values as entered (source of truth for display — DST safe)…
  timezone: text('timezone').notNull().default('America/Los_Angeles'),
  allDay: boolean('all_day').notNull().default(false),
  startDate: date('start_date', { mode: 'string' }).notNull(),
  startTime: time('start_time'),
  endDate: date('end_date', { mode: 'string' }),
  endTime: time('end_time'),
  // …and the resolved instants (for querying/sorting). For recurring events
  // these describe the FIRST occurrence; recurrenceUntil bounds the series.
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),

  recurrenceFreq: recurrenceFreq('recurrence_freq').notNull().default('none'),
  recurrenceInterval: integer('recurrence_interval').notNull().default(1),
  /** Weekdays for weekly rules, e.g. ['WE'] */
  recurrenceByDay: text('recurrence_by_day').array().notNull().default(sql`'{}'::text[]`),
  recurrenceUntil: date('recurrence_until', { mode: 'string' }),
  /** Skipped occurrence dates (YYYY-MM-DD, local). */
  recurrenceExceptions: text('recurrence_exceptions').array().notNull().default(sql`'{}'::text[]`),
  /** Last instant any occurrence ends (null = open-ended series). */
  seriesEndsAt: timestamp('series_ends_at', { withTimezone: true }),

  venue: text('venue').notNull().default(''),
  address: text('address').notNull().default(''),
  audience: text('audience').notNull().default(''),
  cost: text('cost').notNull().default(''),
  details: text('details').array().notNull().default(sql`'{}'::text[]`),
  registrationRequired: boolean('registration_required').notNull().default(false),
  registrationUrl: text('registration_url').notNull().default(''),
  registrationLabel: text('registration_label').notNull().default(''),
  contact: text('contact').notNull().default(''),
  notes: text('notes').notNull().default(''),

  status: eventStatus('status').notNull().default('draft'),
  featured: boolean('featured').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  /** Soft delete: hidden everywhere, kept so the calendar entry can be removed and for audit. */
  deletedAt: timestamp('deleted_at', { withTimezone: true }),

  // Google Calendar sync (CMS is the source of truth for these events)
  googleEventId: text('google_event_id').notNull(),
  syncStatus: syncStatus('sync_status').notNull().default('not_applicable'),
  /** Bumped on every change that affects the calendar. */
  syncVersion: integer('sync_version').notNull().default(1),
  /** Version Google last confirmed (0 = never). */
  syncedVersion: integer('synced_version').notNull().default(0),
  syncError: text('sync_error'),
  syncAttempts: integer('sync_attempts').notNull().default(0),
  syncNextAttemptAt: timestamp('sync_next_attempt_at', { withTimezone: true }),
  syncLockedUntil: timestamp('sync_locked_until', { withTimezone: true }),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  /** Whether the event currently exists (not deleted) on Google. */
  onCalendar: boolean('on_calendar').notNull().default(false),

  /** One-time key from the New Event form; prevents duplicate creates on double-submit. */
  creationKey: text('creation_key').unique(),

  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('event_slug_unique').on(t.slug),
  uniqueIndex('event_google_id_unique').on(t.googleEventId),
  index('event_public_idx').on(t.status, t.startsAt),
  index('event_series_end_idx').on(t.seriesEndsAt),
  index('event_sync_idx').on(t.syncStatus, t.syncNextAttemptAt),
]);

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
  actorEmail: text('actor_email'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  /** Before/after values of changed fields, or extra context. */
  changes: jsonb('changes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('audit_entity_idx').on(t.entityType, t.entityId), index('audit_created_idx').on(t.createdAt)]);

export type EventRow = typeof event.$inferSelect;
export type EventImageRow = typeof eventImage.$inferSelect;
export type CategoryRow = typeof eventCategory.$inferSelect;

/**
 * Google Calendar entries still to be removed for events that were
 * permanently deleted. The event row is gone, so this is the only durable
 * record of the calendar id. Rows are deleted once Google confirms removal
 * (an already-missing event counts as removed).
 */
export const calendarDeletion = pgTable('calendar_deletion', {
  id: uuid('id').primaryKey().defaultRandom(),
  googleEventId: text('google_event_id').notNull().unique(),
  attempts: integer('attempts').notNull().default(0),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('calendar_deletion_due_idx').on(t.nextAttemptAt)]);
