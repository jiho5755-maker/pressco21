export type SourceMessageUpsertInput = {
  id?: string;
  sourceChannel: string;
  sourceMessageId: string;
  messageText: string;
  userChatId?: string | null;
  userName?: string | null;
  agentId?: string | null;
  responseSummary?: string | null;
  modelUsed?: string | null;
  skillTriggered?: string | null;
  tokensUsed?: number;
  responseTimeMs?: number;
  sourceCreatedAt?: string | Date | null;
  metadata?: Record<string, unknown>;
};

export type SourceMessageListInput = {
  sourceChannel?: string;
  search?: string;
  limit?: number;
};

export type SourceMessageItem = {
  id: string;
  sourceChannel: string;
  sourceMessageId: string;
  userChatId: string | null;
  userName: string;
  agentId: string;
  messageText: string;
  responseSummary: string | null;
  modelUsed: string;
  skillTriggered: string;
  tokensUsed: number;
  responseTimeMs: number;
  sourceCreatedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
