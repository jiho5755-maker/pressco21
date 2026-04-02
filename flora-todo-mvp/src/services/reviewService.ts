import { followupRepository } from "@/src/db/repositories/followupRepository";
import { reminderRepository } from "@/src/db/repositories/reminderRepository";
import { taskRepository } from "@/src/db/repositories/taskRepository";

type ReviewQueueOptions = {
  limit?: number;
  page?: number;
  search?: string;
  status?: string;
  priority?: string;
  taskId?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function getReviewQueue(options: ReviewQueueOptions = {}) {
  const limit = clamp(options.limit ?? 12, 1, 100);
  const totalCount = await taskRepository.countReviewQueue({
    search: options.search,
    status: options.status,
    priority: options.priority,
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  let page = clamp(options.page ?? 1, 1, totalPages);

  if (options.taskId) {
    const resolvedPage = await taskRepository.findReviewQueuePageForTask(options.taskId, {
      limit,
      search: options.search,
      status: options.status,
      priority: options.priority,
    });

    if (resolvedPage) {
      page = clamp(resolvedPage, 1, totalPages);
    }
  }

  const pagedTasks = await taskRepository.listReviewQueuePage({
    page,
    limit,
    search: options.search,
    status: options.status,
    priority: options.priority,
  });
  const taskIds = pagedTasks.map((task) => task.id);
  const [reminders, followups] = await Promise.all([
    reminderRepository.listByTaskIds(taskIds),
    followupRepository.listByTaskIds(taskIds),
  ]);

  return {
    items: pagedTasks.map((task) => ({
      ...task,
      reminders: reminders.filter((reminder) => reminder.taskId === task.id),
      followups: followups.filter((followup) => followup.taskId === task.id),
    })),
    page,
    limit,
    totalCount,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}
