import { followupRepository } from "@/src/db/repositories/followupRepository";
import { reminderRepository } from "@/src/db/repositories/reminderRepository";
import { taskRepository } from "@/src/db/repositories/taskRepository";

export async function getReviewQueue(limit = 50) {
  const tasks = await taskRepository.listReviewQueue(limit);
  const taskIds = tasks.map((task) => task.id);
  const [reminders, followups] = await Promise.all([
    reminderRepository.listByTaskIds(taskIds),
    followupRepository.listByTaskIds(taskIds),
  ]);

  return tasks.map((task) => ({
    ...task,
    reminders: reminders.filter((reminder) => reminder.taskId === task.id),
    followups: followups.filter((followup) => followup.taskId === task.id),
  }));
}
