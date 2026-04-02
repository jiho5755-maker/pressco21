import { jsonb, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

export const projectCatalogs = pgTable(
  "project_catalogs",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    category: text("category").notNull().default("legacy"),
    memo: text("memo"),
    sourceChannel: text("source_channel").notNull(),
    sourceMessageId: text("source_message_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("project_catalogs_source_unique").on(table.sourceChannel, table.sourceMessageId)],
);
