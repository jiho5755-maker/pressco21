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
  const rebuildChildTaskIds: string[] = [];

  for (const segment of structuredWithHashes.segments) {
    const existingTask = existingBySegmentHash.get(segment.segmentHash);
    const taskInput = {
      title: segment.task.title,
      detailsJson: {
        ...segment.task.detailsJson,
        rawTextLength: input.text.length,
        parserStatus: "structured",
        normalizedText: structuredWithHashes.normalizedText,
      },
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
      const createdTask = await taskRepository.create({
        id: randomUUID(),
        ...taskInput,
      });
      createdTasks.push(createdTask);
      taskIdBySegmentHash.set(segment.segmentHash, createdTask.id);
      rebuildChildTaskIds.push(createdTask.id);
      continue;
    }

    if (existingTask.reviewedAt) {
      skippedTasks.push(existingTask);
      taskIdBySegmentHash.set(segment.segmentHash, existingTask.id);
      continue;
    }

    const updatedTask = await taskRepository.updateStructuredTask(existingTask.id, taskInput);
    updatedTasks.push(updatedTask);
    taskIdBySegmentHash.set(segment.segmentHash, updatedTask.id);
    rebuildChildTaskIds.push(updatedTask.id);
  }

  const ignoredTasks = await taskRepository.markMissingSegmentsIgnored(
    input.sourceChannel,
    input.sourceMessageId,
    structuredWithHashes.segments.map((segment) => segment.segmentHash),
  );

  await Promise.all([
    reminderRepository.deleteByTaskIds([...rebuildChildTaskIds, ...ignoredTasks.map((task) => task.id)]),
    followupRepository.deleteByTaskIds([...rebuildChildTaskIds, ...ignoredTasks.map((task) => task.id)]),
  ]);

  const reminderInputs = structuredWithHashes.segments.flatMap((segment) => {
    const taskId = taskIdBySegmentHash.get(segment.segmentHash);
    const existingTask = existingBySegmentHash.get(segment.segmentHash);

    if (!taskId || existingTask?.reviewedAt) {
      return [];
    }

    return segment.reminders.map((reminder) => ({
      id: randomUUID(),
      taskId,
      signature: buildReminderSignature(reminder),
      title: reminder.title,
      remindAt: reminder.remindAt,
      kind: reminder.kind,
      message: reminder.message,
      status: reminder.status,
    }));
  });

  const followupInputs = structuredWithHashes.segments.flatMap((segment) => {
    const taskId = taskIdBySegmentHash.get(segment.segmentHash);
    const existingTask = existingBySegmentHash.get(segment.segmentHash);

    if (!taskId || existingTask?.reviewedAt) {
      return [];
    }

    return segment.followups.map((followup) => ({
      id: randomUUID(),
      taskId,
      signature: buildFollowupSignature(followup),
      subject: followup.subject,
      followupType: followup.followupType,
      waitingFor: followup.waitingFor,
      nextCheckAt: followup.nextCheckAt,
      status: followup.status,
      lastNote: followup.lastNote,
    }));
  });

  const [createdReminders, createdFollowups] = await Promise.all([
    reminderRepository.createMany(reminderInputs),
    followupRepository.createMany(followupInputs),
  ]);

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
