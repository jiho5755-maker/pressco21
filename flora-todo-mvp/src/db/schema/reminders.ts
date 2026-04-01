import { text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { tasks } from "./tasks";

export const reminders = pgTable(
  "reminders",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    signature: text("signature").notNull().default(""),
    title: text("title").notNull(),
    remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
    kind: text("kind").notNull().default("manual"),
    message: text("message"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("reminders_task_signature_unique").on(table.taskId, table.signature)],
);
