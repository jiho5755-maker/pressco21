import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/src/db/client";
import { sourceMessages } from "@/src/db/schema";
import { SourceMessageListInput, SourceMessageUpsertInput } from "@/src/types/sourceMessages";

type UpsertSourceMessageRow = {
  id: string;
  sourceChannel: string;
  sourceMessageId: string;
  userChatId?: string | null;
  userName?: string | null;
  agentId?: string | null;
  messageText: string;
  responseSummary?: string | null;
  modelUsed?: string | null;
  skillTriggered?: string | null;
  tokensUsed?: number;
  responseTimeMs?: number;
  sourceCreatedAt?: Date | null;
  metadata?: Record<string, unknown>;
};

function buildSearchClause(search?: string) {
  const normalized = search?.trim();

  if (!normalized) {
    return undefined;
  }

  return or(
    ilike(sourceMessages.messageText, `%${normalized}%`),
    ilike(sourceMessages.responseSummary, `%${normalized}%`),
    ilike(sourceMessages.userName, `%${normalized}%`),
    ilike(sourceMessages.userChatId, `%${normalized}%`),
    ilike(sourceMessages.sourceMessageId, `%${normalized}%`),
  );
}

function buildUpdateSet(input: UpsertSourceMessageRow) {
  const updateSet: Record<string, unknown> = {
    messageText: input.messageText,
    updatedAt: sql`now()`,
  };

  if (input.userChatId !== undefined) {
    updateSet.userChatId = input.userChatId;
  }

  if (input.userName !== undefined) {
    updateSet.userName = input.userName;
  }

  if (input.agentId !== undefined) {
    updateSet.agentId = input.agentId;
  }

  if (input.responseSummary !== undefined) {
    updateSet.responseSummary = input.responseSummary;
  }

  if (input.modelUsed !== undefined) {
    updateSet.modelUsed = input.modelUsed;
  }

  if (input.skillTriggered !== undefined) {
    updateSet.skillTriggered = input.skillTriggered;
  }

  if (input.tokensUsed !== undefined) {
    updateSet.tokensUsed = input.tokensUsed;
  }

  if (input.responseTimeMs !== undefined) {
    updateSet.responseTimeMs = input.responseTimeMs;
  }

  if (input.sourceCreatedAt !== undefined) {
    updateSet.sourceCreatedAt = input.sourceCreatedAt;
  }

  if (input.metadata !== undefined) {
    updateSet.metadata = sql`coalesce(${sourceMessages.metadata}, '{}'::jsonb) || ${JSON.stringify(input.metadata)}::jsonb`;
  }

  return updateSet;
}

export const sourceMessageRepository = {
  async upsert(input: UpsertSourceMessageRow) {
    const [row] = await db
      .insert(sourceMessages)
      .values({
        id: input.id,
        sourceChannel: input.sourceChannel,
        sourceMessageId: input.sourceMessageId,
        userChatId: input.userChatId ?? null,
        userName: input.userName ?? "",
        agentId: input.agentId ?? "owner",
        messageText: input.messageText,
        responseSummary: input.responseSummary ?? null,
        modelUsed: input.modelUsed ?? "unknown",
        skillTriggered: input.skillTriggered ?? "general",
        tokensUsed: input.tokensUsed ?? 0,
        responseTimeMs: input.responseTimeMs ?? 0,
        sourceCreatedAt: input.sourceCreatedAt ?? null,
        metadata: input.metadata ?? {},
      })
      .onConflictDoUpdate({
        target: [sourceMessages.sourceChannel, sourceMessages.sourceMessageId],
        set: buildUpdateSet(input),
      })
      .returning();

    return row;
  },

  async listRecent(input: SourceMessageListInput = {}) {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

    return db
      .select()
      .from(sourceMessages)
      .where(
        and(
          input.sourceChannel ? eq(sourceMessages.sourceChannel, input.sourceChannel) : undefined,
          buildSearchClause(input.search),
        ),
      )
      .orderBy(desc(sourceMessages.sourceCreatedAt), desc(sourceMessages.createdAt), desc(sourceMessages.id))
      .limit(limit);
  },

  async deleteBySourceChannel(sourceChannel: string) {
    await db.delete(sourceMessages).where(eq(sourceMessages.sourceChannel, sourceChannel));
  },
};
