import { jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  detailsJson: jsonb("details_json").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("normal"),
  category: text("category").notNull().default("inbox"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  timeBucket: text("time_bucket"),
  waitingFor: text("waiting_for"),
  relatedProject: text("related_project"),
  sourceText: text("source_text").notNull(),
  sourceChannel: text("source_channel").notNull(),
  sourceMessageId: text("source_message_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
