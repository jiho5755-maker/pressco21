export type IngestRequestBody = {
  sourceChannel: string;
  sourceMessageId: string;
  text: string;
};

export type SummaryResponse = {
  todo: number;
  waiting: number;
  done: number;
  today: number;
  thisWeek: number;
  generatedAt: string;
};
