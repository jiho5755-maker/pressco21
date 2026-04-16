ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "approval_status" text DEFAULT 'none';
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "approval_requested_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "feedback_text" text;
