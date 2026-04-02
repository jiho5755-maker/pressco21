import { integer, jsonb, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

export const sourceMessages = pgTable(
  "source_messages",
  {
    id: text("id").primaryKey(),
    sourceChannel: text("source_channel").notNull(),
    sourceMessageId: text("source_message_id").notNull(),
    userChatId: text("user_chat_id"),
    userName: text("user_name").notNull().default(""),
    agentId: text("agent_id").notNull().default("owner"),
    messageText: text("message_text").notNull(),
    responseSummary: text("response_summary"),
    modelUsed: text("model_used").notNull().default("unknown"),
    skillTriggered: text("skill_triggered").notNull().default("general"),
    tokensUsed: integer("tokens_used").notNull().default(0),
    responseTimeMs: integer("response_time_ms").notNull().default(0),
    sourceCreatedAt: timestamp("source_created_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("source_messages_source_unique").on(table.sourceChannel, table.sourceMessageId),
  ],
);
