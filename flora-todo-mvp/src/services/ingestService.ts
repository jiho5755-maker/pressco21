import { randomUUID } from "node:crypto";
import { taskRepository } from "@/src/db/repositories/taskRepository";
import { deriveTaskTitle } from "@/src/lib/task-title";
import { IngestRequestBody } from "@/src/types/api";

export async function ingestTextAsTask(input: IngestRequestBody) {
  const title = deriveTaskTitle(input.text);

  return taskRepository.create({
    id: randomUUID(),
    title,
    detailsJson: {
      ingestVersion: 1,
      rawTextLength: input.text.length,
      parserStatus: "raw-only",
    },
    status: "todo",
    priority: "normal",
    category: "inbox",
    dueAt: null,
    timeBucket: null,
    waitingFor: null,
    relatedProject: null,
    sourceText: input.text,
    sourceChannel: input.sourceChannel,
    sourceMessageId: input.sourceMessageId,
  });
}
