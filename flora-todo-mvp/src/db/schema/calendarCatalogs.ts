import { jsonb, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

export const calendarCatalogs = pgTable(
  "calendar_catalogs",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull().default(""),
    calendarDate: text("calendar_date"),
    weekday: text("weekday"),
    sourceChannel: text("source_channel").notNull(),
    sourceMessageId: text("source_message_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("calendar_catalogs_source_unique").on(table.sourceChannel, table.sourceMessageId)],
);
