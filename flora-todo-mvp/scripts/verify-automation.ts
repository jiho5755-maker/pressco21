import "dotenv/config";
import { randomUUID } from "node:crypto";
import { pool } from "../src/db/client";
import { taskRepository } from "../src/db/repositories/taskRepository";
import { GET as getMorningBriefRoute } from "../app/api/automation/briefings/morning/route";
import { GET as getOverdueBriefRoute } from "../app/api/automation/briefings/overdue/route";
import { GET as getCalendarSyncRoute } from "../app/api/automation/calendar-sync/route";
import { PATCH as patchAutomationTaskRoute } from "../app/api/automation/tasks/[id]/route";

const sourceChannel = "verify-automation";
const automationKey = process.env.AUTOMATION_API_KEY || "dev-flora-automation-key";

function isoAt(date: Date, hour: number, minute: number) {
  const copy = new Date(date);
  copy.setHours(hour, minute, 0, 0);
  return copy.toISOString();
}

async function main() {
  await pool.query("delete from tasks where source_channel = $1", [sourceChannel]);
  await pool.query("delete from tasks where source_channel = $1 and source_message_id = $2", [
    "google-calendar",
    "automation-gcal",
  ]);

  const now = new Date();
  const todayTask = await taskRepository.upsertStructuredTask({
    id: randomUUID(),
    title: "오늘 아침 발주 확인",
    status: "todo",
    priority: "p1",
    category: "ops",
    dueAt: new Date(isoAt(now, 9, 0)),
    relatedProject: "운영",
    sourceText: "오늘 아침 발주 확인",
    sourceChannel,
    sourceMessageId: "automation-today",
    segmentHash: "automation-today",
    segmentIndex: 0,
    detailsJson: {},
  });

  await taskRepository.upsertStructuredTask({
    id: randomUUID(),
    title: "이틀 전 회신 정리",
    status: "todo",
    priority: "p2",
    category: "ops",
    dueAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    relatedProject: "정산",
    sourceText: "이틀 전 회신 정리",
    sourceChannel,
    sourceMessageId: "automation-overdue",
    segmentHash: "automation-overdue",
    segmentIndex: 0,
    detailsJson: {},
  });

  const syncTask = await taskRepository.upsertStructuredTask({
    id: randomUUID(),
    title: "내일 촬영 일정",
    status: "in_progress",
    priority: "p2",
    category: "marketing",
    dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    relatedProject: "콘텐츠",
    sourceText: "내일 촬영 일정",
    sourceChannel,
    sourceMessageId: "automation-sync",
    segmentHash: "automation-sync",
    segmentIndex: 0,
    detailsJson: {},
  });

  await taskRepository.upsertStructuredTask({
    id: randomUUID(),
    title: "gcal에서 넘어온 일정",
    status: "todo",
    priority: "p3",
    category: "calendar",
    dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    relatedProject: "캘린더",
    sourceText: "gcal에서 넘어온 일정",
    sourceChannel: "google-calendar",
    sourceMessageId: "automation-gcal",
    segmentHash: "automation-gcal",
    segmentIndex: 0,
    detailsJson: {
      importedFrom: "google-calendar",
    },
  });

  const headers = {
    authorization: "Bearer " + automationKey,
  };

  const morningResponse = await getMorningBriefRoute(
    new Request("http://local/api/automation/briefings/morning?limit=10", {
      headers,
    }),
  );
  const overdueResponse = await getOverdueBriefRoute(
    new Request("http://local/api/automation/briefings/overdue?limit=10", {
      headers,
    }),
  );
  const calendarResponse = await getCalendarSyncRoute(
    new Request("http://local/api/automation/calendar-sync?since=2000-01-01T00:00:00.000Z&limit=10", {
      headers,
    }),
  );
  const patchResponse = await patchAutomationTaskRoute(
    new Request("http://local/api/automation/tasks/" + syncTask.id, {
      method: "PATCH",
      headers: {
        ...headers,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        status: "in_progress",
        priority: "p1",
        detailsMerge: {
          calendarEventId: "gcal-test-001",
          calendarSync: {
            eventId: "gcal-test-001",
            lastSyncedAt: now.toISOString(),
            origin: "flora",
          },
        },
      }),
    }),
    { params: Promise.resolve({ id: syncTask.id }) },
  );

  const morningPayload = await morningResponse.json();
  const overduePayload = await overdueResponse.json();
  const calendarPayload = await calendarResponse.json();
  const patchPayload = await patchResponse.json();
  const patchedTask = await taskRepository.findById(syncTask.id);

  console.log(
    JSON.stringify(
      {
        morningPayload,
        overduePayload,
        calendarPayload,
        patchPayload,
        patchedTask,
      },
      null,
      2,
    ),
  );

  if (
    !morningPayload.ok ||
    morningPayload.count < 1 ||
    !morningPayload.text.includes("오늘 아침 발주 확인") ||
    !overduePayload.ok ||
    overduePayload.count < 1 ||
    !overduePayload.text.includes("이틀 전 회신 정리") ||
    !calendarPayload.ok ||
    !calendarPayload.items.some((item: { taskId: string }) => item.taskId === syncTask.id) ||
    calendarPayload.items.some((item: { sourceChannel: string }) => item.sourceChannel === "google-calendar") ||
    !patchPayload.ok ||
    patchedTask?.priority !== "p1" ||
    (patchedTask?.detailsJson?.calendarEventId as string | undefined) !== "gcal-test-001"
  ) {
    throw new Error("automation verification failed");
  }

  await pool.query("delete from tasks where source_channel = $1", [sourceChannel]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
