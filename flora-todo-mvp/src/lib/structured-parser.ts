import { TaskPriority, TaskStatus } from "@/src/domain/task";
import { deriveTaskTitle } from "@/src/lib/task-title";
import { buildNextCheckAt, extractTemporalSignals } from "@/src/lib/date-extractor";
import {
  FollowupDraft,
  ReminderDraft,
  StructuredMemoResult,
  StructuredSegment,
} from "@/src/types/structured";

const compoundSeparators = [
  /\s+및\s+/,
  /\s+그리고\s+/,
  /\s+주고\s+/,
  /\s+도 같이\s+/,
  /,\s+/,
];

const statusRules: Array<{ status: TaskStatus; patterns: RegExp[] }> = [
  { status: "waiting", patterns: [/대기/, /기다림/, /연락 대기/, /회신 대기/, /수신 대기/] },
  { status: "needs_check", patterns: [/확인 필요/, /다시 확인/, /점검/] },
  { status: "in_progress", patterns: [/진행중/, /하고 있음/] },
  { status: "done", patterns: [/완료/, /끝남/] },
];

const priorityRules: Array<{ priority: TaskPriority; patterns: RegExp[] }> = [
  { priority: "p1", patterns: [/최우선/, /가장 급함/, /오늘 꼭/] },
  { priority: "p2", patterns: [/이번주 안에/, /중요/, /먼저/] },
  { priority: "p4", patterns: [/장기 검토/, /보류/] },
];

const followupRules = [
  /연락 대기/,
  /회신 대기/,
  /수신 대기/,
  /말씀주시기로 함/,
  /다시 확인/,
  /나중에 확인/,
  /아직 없음/,
];

function cleanupLine(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/^\s*(?:[-*•]|\d+[.)])\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitCompoundLine(line: string) {
  let parts = [line];

  for (const separator of compoundSeparators) {
    const nextParts = parts.flatMap((part) => {
      const chunks = part.split(separator).map((chunk) => cleanupLine(chunk));
      const validChunks = chunks.filter((chunk) => chunk.length >= 4);
      return validChunks.length >= 2 ? validChunks : [part];
    });

    parts = nextParts;
  }

  return parts.filter(Boolean);
}

export function splitMemoText(text: string) {
  const normalizedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\u2022/g, "\n- ")
    .trim();

  const rawLines = normalizedText
    .split(/\n+/)
    .map((line) => cleanupLine(line))
    .filter(Boolean);

  const segments = rawLines.flatMap((line) => splitCompoundLine(line));
  return {
    normalizedText,
    segments: segments.length > 0 ? segments : [cleanupLine(text)],
  };
}

function inferStatus(text: string) {
  const matched: string[] = [];

  for (const rule of statusRules) {
    const hasMatch = rule.patterns.some((pattern) => pattern.test(text));
    if (hasMatch) {
      matched.push(rule.status);
      return { status: rule.status, matched };
    }
  }

  return { status: "todo" as TaskStatus, matched };
}

function inferPriority(text: string) {
  const matched: string[] = [];

  for (const rule of priorityRules) {
    const hasMatch = rule.patterns.some((pattern) => pattern.test(text));
    if (hasMatch) {
      matched.push(rule.priority);
      return { priority: rule.priority, matched };
    }
  }

  return { priority: "p3" as TaskPriority, matched };
}

function extractWaitingFor(text: string, signal: string) {
  const regex = new RegExp(`^(.*?)(?:\\s+)?${signal}$`);
  const match = text.match(regex);

  if (!match) {
    return null;
  }

  const candidate = cleanupLine(match[1] ?? "");
  return candidate.length > 1 ? candidate : null;
}

function extractFollowups(text: string, now = new Date(), dueAt: Date | null = null) {
  const followups: FollowupDraft[] = [];
  const matchedSignals: string[] = [];

  for (const rule of followupRules) {
    const match = text.match(rule);
    if (!match) {
      continue;
    }

    const signal = match[0];
    matchedSignals.push(signal);

    followups.push({
      subject: deriveTaskTitle(text),
      followupType: signal.includes("확인") ? "checkback" : "waiting_response",
      waitingFor: extractWaitingFor(text, signal),
      nextCheckAt: buildNextCheckAt(signal, dueAt, now),
      status: signal.includes("대기") || signal.includes("없음") ? "waiting" : "open",
      lastNote: text,
      sourceSignal: signal,
    });
  }

  return { followups, matchedSignals };
}

function buildReminders(title: string, temporal: ReturnType<typeof extractTemporalSignals>) {
  const reminders: ReminderDraft[] = [];

  if (temporal.dueAt && temporal.reminderAt) {
    reminders.push({
      title,
      remindAt: temporal.reminderAt,
      kind: temporal.isDeadline ? "deadline" : "schedule",
      message: temporal.isDeadline ? `${title} 마감 확인` : `${title} 일정 확인`,
      status: "pending",
      sourceSignal: temporal.matchedExpressions.join(", "),
    });
  }

  return reminders;
}

export function structureMemoText(text: string, now = new Date()): StructuredMemoResult {
  const { normalizedText, segments } = splitMemoText(text);

  const structuredSegments: StructuredSegment[] = segments.map((segment) => {
    const status = inferStatus(segment);
    const priority = inferPriority(segment);
    const temporal = extractTemporalSignals(segment, now);
    const followupResult = extractFollowups(segment, now, temporal.dueAt);
    const taskStatus = followupResult.followups.length > 0 && status.status === "todo" ? "waiting" : status.status;
    const waitingFor = followupResult.followups[0]?.waitingFor ?? null;
    const title = deriveTaskTitle(segment);
    const reminders = buildReminders(title, temporal);

    return {
      sourceSegment: segment,
      task: {
        title,
        sourceSegment: segment,
        status: taskStatus,
        priority: priority.priority,
        category: "inbox",
        dueAt: temporal.dueAt,
        timeBucket: temporal.timeBucket,
        waitingFor,
        relatedProject: null,
        detailsJson: {
          structuredVersion: 2,
          sourceSegment: segment,
          matchedStatus: status.matched,
          matchedPriority: priority.matched,
          matchedTemporal: temporal.matchedExpressions,
          matchedFollowup: followupResult.matchedSignals,
        },
      },
      reminders,
      followups: followupResult.followups,
      debug: {
        matchedStatus: status.matched,
        matchedPriority: priority.matched,
        matchedTemporal: temporal.matchedExpressions,
        matchedFollowup: followupResult.matchedSignals,
      },
    };
  });

  return {
    rawText: text,
    normalizedText,
    segments: structuredSegments.length > 0 ? structuredSegments : [],
  };
}
