import { integer, jsonb, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    detailsJson: jsonb("details_json").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").notNull().default("todo"),
    priority: text("priority").notNull().default("p3"),
    category: text("category").notNull().default("inbox"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    timeBucket: text("time_bucket"),
    assignee: text("assignee"),
    waitingFor: text("waiting_for"),
    relatedProject: text("related_project"),
    sourceText: text("source_text").notNull(),
    sourceChannel: text("source_channel").notNull(),
    sourceMessageId: text("source_message_id").notNull(),
    segmentHash: text("segment_hash").notNull().default(""),
    segmentIndex: integer("segment_index").notNull().default(0),
    approvalStatus: text("approval_status").default("none"),
    approvalRequestedAt: timestamp("approval_requested_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    feedbackText: text("feedback_text"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ignoredAt: timestamp("ignored_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tasks_source_message_segment_unique").on(
      table.sourceChannel,
      table.sourceMessageId,
      table.segmentHash,
    ),
  ],
);
