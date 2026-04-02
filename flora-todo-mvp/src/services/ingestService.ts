import { randomUUID } from "node:crypto";
import { buildFollowupSignature, buildReminderSignature, buildSegmentHash } from "@/src/lib/fingerprint";
import { structureMemoText } from "@/src/lib/structured-parser";
import { IngestRequestBody } from "@/src/types/api";

async function loadRepositories() {
  const [{ followupRepository }, { reminderRepository }, { taskRepository }] = await Promise.all([
    import("@/src/db/repositories/followupRepository"),
    import("@/src/db/repositories/reminderRepository"),
    import("@/src/db/repositories/taskRepository"),
  ]);

  return {
    followupRepository,
    reminderRepository,
    taskRepository,
  };
}

export async function ingestTextAsTask(input: IngestRequestBody) {
  const structured = structureMemoText(input.text);
  const structuredWithHashes = {
    ...structured,
    segments: structured.segments.map((segment, index) => ({
      ...segment,
      segmentIndex: index,
      segmentHash: buildSegmentHash(input.sourceChannel, input.sourceMessageId, segment.sourceSegment),
    })),
  };

  if (input.dryRun) {
    return {
      dryRun: true,
      structured: structuredWithHashes,
      created: {
        tasks: [],
        reminders: [],
        followups: [],
      },
      dedupe: {
        created: 0,
        updated: 0,
        skipped: 0,
        ignored: 0,
      },
    };
  }

  const { followupRepository, reminderRepository, taskRepository } = await loadRepositories();
  const existingTasks = await taskRepository.listBySourceMessage(input.sourceChannel, input.sourceMessageId);
  const existingBySegmentHash = new Map(existingTasks.map((task) => [task.segmentHash, task]));

  const createdTasks = [];
  const updatedTasks = [];
  const skippedTasks = [];
  const taskIdBySegmentHash = new Map<string, string>();
  const syncableSegments = [];

  for (const segment of structuredWithHashes.segments) {
    const existingTask = existingBySegmentHash.get(segment.segmentHash);
    const mergedDetailsJson = {
      ...segment.task.detailsJson,
      rawTextLength: input.text.length,
      parserStatus: "structured",
      normalizedText: structuredWithHashes.normalizedText,
      ...(input.detailsMerge ?? {}),
    };
    const taskInput = {
      title: segment.task.title,
      detailsJson: mergedDetailsJson,
      status: segment.task.status,
      priority: segment.task.priority,
      category: segment.task.category,
      dueAt: segment.task.dueAt,
      timeBucket: segment.task.timeBucket,
      waitingFor: segment.task.waitingFor,
      relatedProject: segment.task.relatedProject,
      sourceText: input.text,
      sourceChannel: input.sourceChannel,
      sourceMessageId: input.sourceMessageId,
      segmentHash: segment.segmentHash,
      segmentIndex: segment.segmentIndex,
    };

    if (!existingTask) {
      const createdTask = await taskRepository.upsertStructuredTask({
        id: randomUUID(),
        ...taskInput,
      });
      createdTasks.push(createdTask);
      taskIdBySegmentHash.set(segment.segmentHash, createdTask.id);
      syncableSegments.push(segment);
      continue;
    }

    if (existingTask.reviewedAt) {
      skippedTasks.push(existingTask);
      taskIdBySegmentHash.set(segment.segmentHash, existingTask.id);
      continue;
    }

    const updatedTask = await taskRepository.upsertStructuredTask({
      id: existingTask.id,
      ...taskInput,
    });
    updatedTasks.push(updatedTask);
    taskIdBySegmentHash.set(segment.segmentHash, updatedTask.id);
    syncableSegments.push(segment);
  }

  const ignoredTasks = await taskRepository.markMissingSegmentsIgnored(
    input.sourceChannel,
    input.sourceMessageId,
    structuredWithHashes.segments.map((segment) => segment.segmentHash),
  );

  await Promise.all([
    reminderRepository.deleteByTaskIds(ignoredTasks.map((task) => task.id)),
    followupRepository.deleteByTaskIds(ignoredTasks.map((task) => task.id)),
  ]);

  const reminderInputsByTaskId = new Map<string, Array<{
    id: string;
    taskId: string;
    signature: string;
    title: string;
    remindAt: Date;
    kind: string;
    message: string | null;
    status: string;
  }>>();
  const followupInputsByTaskId = new Map<string, Array<{
    id: string;
    taskId: string;
    signature: string;
    subject: string;
    followupType: string;
    waitingFor: string | null;
    nextCheckAt: Date | null;
    status: string;
    lastNote: string | null;
  }>>();

  for (const segment of syncableSegments) {
    const taskId = taskIdBySegmentHash.get(segment.segmentHash);
    if (!taskId) {
      continue;
    }

    reminderInputsByTaskId.set(taskId, segment.reminders.map((reminder) => ({
      id: randomUUID(),
      taskId,
      signature: buildReminderSignature(reminder),
      title: reminder.title,
      remindAt: reminder.remindAt,
      kind: reminder.kind,
      message: reminder.message,
      status: reminder.status,
    })));

    followupInputsByTaskId.set(taskId, segment.followups.map((followup) => ({
      id: randomUUID(),
      taskId,
      signature: buildFollowupSignature(followup),
      subject: followup.subject,
      followupType: followup.followupType,
      waitingFor: followup.waitingFor,
      nextCheckAt: followup.nextCheckAt,
      status: followup.status,
      lastNote: followup.lastNote,
    })));
  }

  const createdReminders = [];
  const createdFollowups = [];

  for (const [taskId, reminderInputs] of reminderInputsByTaskId.entries()) {
    const syncedReminders = await reminderRepository.syncByTaskId(taskId, reminderInputs);
    createdReminders.push(...syncedReminders);
  }

  for (const [taskId, followupInputs] of followupInputsByTaskId.entries()) {
    const syncedFollowups = await followupRepository.syncByTaskId(taskId, followupInputs);
    createdFollowups.push(...syncedFollowups);
  }

  return {
    dryRun: false,
    structured: structuredWithHashes,
    created: {
      tasks: [...createdTasks, ...updatedTasks],
      reminders: createdReminders,
      followups: createdFollowups,
    },
    dedupe: {
      created: createdTasks.length,
      updated: updatedTasks.length,
      skipped: skippedTasks.length,
      ignored: ignoredTasks.length,
    },
  };
}
