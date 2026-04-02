import "dotenv/config";
import { pool } from "../src/db/client";
import { taskRepository } from "../src/db/repositories/taskRepository";
import { ingestTextAsTask } from "../src/services/ingestService";
import { buildDashboardData, loadDashboardSnapshot } from "../src/services/dashboardService";

const sourceChannel = "verify-dashboard-sprint3";
const samples = [
  {
    sourceMessageId: "home-1",
    text: "오늘 오후 5시 수주 확인 전화 돌리기",
    patch: {
      priority: "p1" as const,
      status: "todo" as const,
      category: "ops",
    },
  },
  {
    sourceMessageId: "home-2",
    text: "이번주 안에 자사몰 배너 교체",
    patch: {
      priority: "p2" as const,
      status: "todo" as const,
      category: "marketing",
      relatedProject: "자사몰 개편",
    },
  },
  {
    sourceMessageId: "home-3",
    text: "안소영 연락 대기",
    patch: {
      priority: "p2" as const,
      status: "waiting" as const,
      category: "partner",
      waitingFor: "안소영",
    },
  },
  {
    sourceMessageId: "home-4",
    text: "내일 오후 2시 배송 라벨 확인",
    patch: {
      priority: "p3" as const,
      status: "todo" as const,
      category: "warehouse",
    },
  },
  {
    sourceMessageId: "home-5",
    text: "다음주 월요일 거래처 회신 정리",
    patch: {
      priority: "p2" as const,
      status: "todo" as const,
      category: "sales",
    },
  },
  {
    sourceMessageId: "home-6",
    text: "오늘 저녁 8시 텔레그램 공지 발송",
    patch: {
      priority: "p1" as const,
      status: "in_progress" as const,
      category: "notice",
    },
  },
];

async function main() {
  await pool.query("delete from tasks where source_channel = $1", [sourceChannel]);

  for (const sample of samples) {
    await ingestTextAsTask({
      sourceChannel,
      sourceMessageId: sample.sourceMessageId,
      text: sample.text,
    });

    const [task] = await taskRepository.listBySourceMessage(sourceChannel, sample.sourceMessageId);
    if (!task) {
      throw new Error(`task not found for ${sample.sourceMessageId}`);
    }

    await taskRepository.patchReviewTask(task.id, sample.patch);
  }

  const snapshot = await loadDashboardSnapshot();
  const scopedTasks = snapshot.filter((task) => task.sourceChannel === sourceChannel);
  const dashboard = buildDashboardData(scopedTasks, {
    dateRange: "thisWeek",
    filters: {
      search: "",
      status: "all",
      priority: "all",
      sort: "createdAt",
    },
    selectedTaskId: null,
  });
  const summary = dashboard.summary;
  const sections = dashboard.sections;

  const result = {
    summary,
    sectionTitles: {
      topPriority: sections.topPriority.map((task) => task.title),
      today: sections.today.map((task) => task.title),
      thisWeek: sections.focus.map((task) => task.title),
      waiting: sections.waiting.map((task) => task.title),
      upcoming: sections.upcoming.map((task) => task.title),
      recent: sections.recent.map((task) => task.title),
    },
  };

  console.log(JSON.stringify(result, null, 2));

  if (
    scopedTasks.length !== samples.length ||
    summary.todo !== 5 ||
    summary.waiting !== 1 ||
    summary.today !== 2 ||
    summary.thisWeek !== 4 ||
    summary.upcoming !== 4 ||
    summary.topPriority !== 2 ||
    sections.topPriority.length !== 2 ||
    !sections.waiting.some((task) => task.waitingFor === "안소영") ||
    sections.recent[0]?.sourceMessageId !== "home-6"
  ) {
    throw new Error("dashboard verification failed");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
