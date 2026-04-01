import { randomUUID } from "node:crypto";
import { followupRepository } from "@/src/db/repositories/followupRepository";
import { reminderRepository } from "@/src/db/repositories/reminderRepository";
import { taskRepository } from "@/src/db/repositories/taskRepository";
import { structureMemoText } from "@/src/lib/structured-parser";
import { IngestRequestBody } from "@/src/types/api";

export async function ingestTextAsTask(input: IngestRequestBody) {
  const structured = structureMemoText(input.text);

  if (input.dryRun) {
    return {
      dryRun: true,
      structured,
      created: {
        tasks: [],
        reminders: [],
        followups: [],
      },
    };
  }

  const taskInputs = structured.segments.map((segment) => ({
    id: randomUUID(),
    title: segment.task.title,
    detailsJson: {
      ...segment.task.detailsJson,
      rawTextLength: input.text.length,
      parserStatus: "structured",
      normalizedText: structured.normalizedText,
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
  }));

  const createdTasks = await taskRepository.createMany(taskInputs);
  const taskIdByIndex = new Map(createdTasks.map((task, index) => [index, task.id]));

  const reminderInputs = structured.segments.flatMap((segment, index) =>
    segment.reminders.map((reminder) => ({
      id: randomUUID(),
      taskId: taskIdByIndex.get(index)!,
      title: reminder.title,
      remindAt: reminder.remindAt,
      kind: reminder.kind,
      message: reminder.message,
      status: reminder.status,
    })),
  );

  const followupInputs = structured.segments.flatMap((segment, index) =>
    segment.followups.map((followup) => ({
      id: randomUUID(),
      taskId: taskIdByIndex.get(index)!,
      subject: followup.subject,
      followupType: followup.followupType,
      waitingFor: followup.waitingFor,
      nextCheckAt: followup.nextCheckAt,
      status: followup.status,
      lastNote: followup.lastNote,
    })),
  );

  const [createdReminders, createdFollowups] = await Promise.all([
    reminderRepository.createMany(reminderInputs),
    followupRepository.createMany(followupInputs),
  ]);

  return {
    dryRun: false,
    structured,
    created: {
      tasks: createdTasks,
      reminders: createdReminders,
      followups: createdFollowups,
    },
  };
}
