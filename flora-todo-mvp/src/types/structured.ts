import { TaskPriority, TaskStatus } from "@/src/domain/task";

export type TemporalExtraction = {
  dueAt: Date | null;
  timeBucket: string | null;
  reminderAt: Date | null;
  matchedExpressions: string[];
  isDeadline: boolean;
  isBeforeConstraint: boolean;
};

export type FollowupDraft = {
  subject: string;
  followupType: string;
  waitingFor: string | null;
  nextCheckAt: Date | null;
  status: string;
  lastNote: string | null;
  sourceSignal: string;
};

export type ReminderDraft = {
  title: string;
  remindAt: Date;
  kind: string;
  message: string | null;
  status: string;
  sourceSignal: string;
};

export type StructuredTaskDraft = {
  title: string;
  sourceSegment: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  dueAt: Date | null;
  timeBucket: string | null;
  waitingFor: string | null;
  relatedProject: string | null;
  detailsJson: Record<string, unknown>;
};

export type StructuredSegment = {
  sourceSegment: string;
  segmentHash: string;
  segmentIndex: number;
  task: StructuredTaskDraft;
  reminders: ReminderDraft[];
  followups: FollowupDraft[];
  debug: {
    matchedStatus: string[];
    matchedPriority: string[];
    matchedTemporal: string[];
    matchedFollowup: string[];
    entities: {
      people: string[];
      companies: string[];
      projects: string[];
    };
  };
};

export type StructuredMemoResult = {
  rawText: string;
  normalizedText: string;
  segments: StructuredSegment[];
};
