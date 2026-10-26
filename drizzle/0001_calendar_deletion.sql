CREATE TABLE "calendar_deletion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_event_id" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_deletion_google_event_id_unique" UNIQUE("google_event_id")
);
--> statement-breakpoint
CREATE INDEX "calendar_deletion_due_idx" ON "calendar_deletion" USING btree ("next_attempt_at");