ALTER TABLE "tasks" ADD COLUMN "segment_hash" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "segment_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "ignored_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "signature" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "followups" ADD COLUMN "signature" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_source_message_segment_unique" ON "tasks" USING btree ("source_channel","source_message_id","segment_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "reminders_task_signature_unique" ON "reminders" USING btree ("task_id","signature");--> statement-breakpoint
CREATE UNIQUE INDEX "followups_task_signature_unique" ON "followups" USING btree ("task_id","signature");