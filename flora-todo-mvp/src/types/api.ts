export type IngestRequestBody = {
  sourceChannel: string;
  sourceMessageId: string;
  text: string;
  userChatId?: string | null;
  userName?: string | null;
  agentId?: string | null;
  responseSummary?: string | null;
  modelUsed?: string | null;
  skillTriggered?: string | null;
  tokensUsed?: number;
  responseTimeMs?: number;
  sourceCreatedAt?: string | null;
  metadata?: Record<string, unknown>;
  detailsMerge?: Record<string, unknown>;
  dryRun?: boolean;
};

export type SummaryResponse = {
  todo: number;
  waiting: number;
  done: number;
  today: number;
  thisWeek: number;
  topPriority: number;
  upcoming: number;
  generatedAt: string;
};
