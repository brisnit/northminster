CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'cancelled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."recurrence_freq" AS ENUM('none', 'weekly', 'monthly_weekday', 'monthly_date');--> statement-breakpoint
CREATE TYPE "public"."calendar_sync_status" AS ENUM('not_applicable', 'not_configured', 'pending', 'synced', 'error');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"actor_email" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"changes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"description_html" text DEFAULT '' NOT NULL,
	"category_id" uuid,
	"image_id" uuid,
	"image_alt" text DEFAULT '' NOT NULL,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"start_date" date NOT NULL,
	"start_time" time,
	"end_date" date,
	"end_time" time,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"recurrence_freq" "recurrence_freq" DEFAULT 'none' NOT NULL,
	"recurrence_interval" integer DEFAULT 1 NOT NULL,
	"recurrence_by_day" text[] DEFAULT '{}'::text[] NOT NULL,
	"recurrence_until" date,
	"recurrence_exceptions" text[] DEFAULT '{}'::text[] NOT NULL,
	"series_ends_at" timestamp with time zone,
	"venue" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"audience" text DEFAULT '' NOT NULL,
	"cost" text DEFAULT '' NOT NULL,
	"details" text[] DEFAULT '{}'::text[] NOT NULL,
	"registration_required" boolean DEFAULT false NOT NULL,
	"registration_url" text DEFAULT '' NOT NULL,
	"registration_label" text DEFAULT '' NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"google_event_id" text NOT NULL,
	"sync_status" "calendar_sync_status" DEFAULT 'not_applicable' NOT NULL,
	"sync_version" integer DEFAULT 1 NOT NULL,
	"synced_version" integer DEFAULT 0 NOT NULL,
	"sync_error" text,
	"sync_attempts" integer DEFAULT 0 NOT NULL,
	"sync_next_attempt_at" timestamp with time zone,
	"sync_locked_until" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"on_calendar" boolean DEFAULT false NOT NULL,
	"creation_key" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_creation_key_unique" UNIQUE("creation_key")
);
--> statement-breakpoint
CREATE TABLE "event_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_category_name_unique" UNIQUE("name"),
	CONSTRAINT "event_category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"storage_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" integer NOT NULL,
	"mime_type" text NOT NULL,
	"focal_x" real DEFAULT 0.5 NOT NULL,
	"focal_y" real DEFAULT 0.5 NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'editor',
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_category_id_event_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."event_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_image_id_event_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."event_image"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_image" ADD CONSTRAINT "event_image_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "event_slug_unique" ON "event" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "event_google_id_unique" ON "event" USING btree ("google_event_id");--> statement-breakpoint
CREATE INDEX "event_public_idx" ON "event" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "event_series_end_idx" ON "event" USING btree ("series_ends_at");--> statement-breakpoint
CREATE INDEX "event_sync_idx" ON "event" USING btree ("sync_status","sync_next_attempt_at");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");