import { randomUUID } from "node:crypto";
import { sourceMessageRepository } from "@/src/db/repositories/sourceMessageRepository";
import { SourceMessageItem, SourceMessageListInput, SourceMessageUpsertInput } from "@/src/types/sourceMessages";

function toDate(value: string | Date | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid sourceCreatedAt");
  }

  return parsed;
}

function normalizeString(value: string | null | undefined, fallback?: string) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value?.trim();

  if (!normalized) {
    return fallback ?? null;
  }

  return normalized;
}

function toSourceMessageItem(record: Awaited<ReturnType<typeof sourceMessageRepository.upsert>>): SourceMessageItem {
  return {
    id: record.id,
    sourceChannel: record.sourceChannel,
    sourceMessageId: record.sourceMessageId,
    userChatId: record.userChatId,
    userName: record.userName,
    agentId: record.agentId,
    messageText: record.messageText,
    responseSummary: record.responseSummary,
    modelUsed: record.modelUsed,
    skillTriggered: record.skillTriggered,
    tokensUsed: record.tokensUsed,
    responseTimeMs: record.responseTimeMs,
    sourceCreatedAt: record.sourceCreatedAt?.toISOString() ?? null,
    metadata: record.metadata ?? {},
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function logSourceMessage(input: SourceMessageUpsertInput) {
  const record = await sourceMessageRepository.upsert({
    id: input.id ?? randomUUID(),
    sourceChannel: input.sourceChannel.trim(),
    sourceMessageId: input.sourceMessageId.trim(),
    messageText: input.messageText.trim(),
    userChatId: normalizeString(input.userChatId),
    userName: normalizeString(input.userName, ""),
    agentId: normalizeString(input.agentId, "owner"),
    responseSummary: normalizeString(input.responseSummary),
    modelUsed: normalizeString(input.modelUsed, "unknown"),
    skillTriggered: normalizeString(input.skillTriggered, "general"),
    tokensUsed: input.tokensUsed === undefined ? undefined : Math.max(0, Math.round(input.tokensUsed)),
    responseTimeMs: input.responseTimeMs === undefined ? undefined : Math.max(0, Math.round(input.responseTimeMs)),
    sourceCreatedAt: toDate(input.sourceCreatedAt),
    metadata: input.metadata,
  });

  return toSourceMessageItem(record);
}

export async function listSourceMessages(input: SourceMessageListInput = {}) {
  const rows = await sourceMessageRepository.listRecent(input);
  return rows.map((row) => toSourceMessageItem(row));
}
