import { text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { tasks } from "./tasks";

export const followups = pgTable("followups", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  followupType: text("followup_type").notNull().default("manual"),
  waitingFor: text("waiting_for"),
  nextCheckAt: timestamp("next_check_at", { withTimezone: true }),
  status: text("status").notNull().default("open"),
  lastNote: text("last_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
