import { taskRepository } from "@/src/db/repositories/taskRepository";
import { getEndOfToday, getEndOfWeek, getStartOfToday } from "@/src/lib/time";
import { SummaryResponse } from "@/src/types/api";

export async function getTaskSummary(): Promise<SummaryResponse> {
  const todayStart = getStartOfToday();
  const todayEnd = getEndOfToday();
  const weekEnd = getEndOfWeek();

  const summary = await taskRepository.getSummary({
    todayStart,
    todayEnd,
    weekEnd,
  });

  return {
    ...summary,
    generatedAt: new Date().toISOString(),
  };
}
