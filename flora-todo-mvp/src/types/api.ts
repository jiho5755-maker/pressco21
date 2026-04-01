export type IngestRequestBody = {
  sourceChannel: string;
  sourceMessageId: string;
  text: string;
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
