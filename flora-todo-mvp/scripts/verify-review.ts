import "dotenv/config";
import { pool } from "../src/db/client";
import { getTaskSummary } from "../src/services/summaryService";
import { ingestTextAsTask } from "../src/services/ingestService";
import { GET as getReviewRoute } from "../app/api/admin/review/route";
import { PATCH as patchTaskRoute } from "../app/api/admin/tasks/[id]/route";
import { PATCH as patchReminderRoute } from "../app/api/admin/reminders/[id]/route";
import { DELETE as deleteFollowupRoute } from "../app/api/admin/followups/[id]/route";

const sourceChannel = "verify-review";
const sourceMessageId = "review-001";
const sample = "다음주 월요일 안소영 연락 대기";

async function main() {
  await pool.query("delete from tasks where source_channel = $1", [sourceChannel]);

  const ingestResult = await ingestTextAsTask({
    sourceChannel,
    sourceMessageId,
    text: sample,
  });

  const createdTask = ingestResult.created.tasks[0];
  const createdReminder = ingestResult.created.reminders[0];
  const createdFollowup = ingestResult.created.followups[0];
  const beforeSummary = await getTaskSummary();

  const patchedDueAt = "2026-04-10T09:30:00+09:00";
  const patchedReminderAt = "2026-04-09T18:00:00+09:00";

  const taskPatchResponse = await patchTaskRoute(
    new Request("http://local/api/admin/tasks/" + createdTask.id, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "레지너스 확인 일정 조정",
        status: "resolved",
        priority: "p1",
        category: "ops",
        dueAt: patchedDueAt,
        waitingFor: "안소영",
        relatedProject: "자사몰 개편",
      }),
    }),
    { params: Promise.resolve({ id: createdTask.id }) },
  );

  const reminderPatchResponse = await patchReminderRoute(
    new Request("http://local/api/admin/reminders/" + createdReminder.id, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "레지너스 확인 일정 조정",
        remindAt: patchedReminderAt,
        kind: "deadline",
        message: "운영 검토 후 재확인",
        status: "done",
      }),
    }),
    { params: Promise.resolve({ id: createdReminder.id }) },
  );

  const followupDeleteResponse = await deleteFollowupRoute(
    new Request("http://local/api/admin/followups/" + createdFollowup.id, {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id: createdFollowup.id }) },
  );

  const secondIngest = await ingestTextAsTask({
    sourceChannel,
    sourceMessageId,
    text: sample,
  });

  const queueResponse = await getReviewRoute(new Request("http://local/api/admin/review?limit=20"));
  const afterSummary = await getTaskSummary();
  const taskRows = await pool.query<{
    id: string;
    title: string;
    status: string;
    priority: string;
    category: string;
    due_at: string | null;
    waiting_for: string | null;
    related_project: string | null;
    reviewed_at: string | null;
  }>(
    `
      select
        id,
        title,
        status,
        priority,
        category,
        due_at::text as due_at,
        waiting_for,
        related_project,
        reviewed_at::text as reviewed_at
      from tasks
      where source_channel = $1 and source_message_id = $2 and ignored_at is null
    `,
    [sourceChannel, sourceMessageId],
  );
  const reminderRows = await pool.query<{
    id: string;
    title: string;
    remind_at: string;
    kind: string;
    message: string | null;
    status: string;
  }>(
    `
      select r.id, r.title, r.remind_at::text as remind_at, r.kind, r.message, r.status
      from reminders r
      join tasks t on t.id = r.task_id
      where t.source_channel = $1 and t.source_message_id = $2 and t.ignored_at is null
    `,
    [sourceChannel, sourceMessageId],
  );
  const followupRows = await pool.query<{
    id: string;
  }>(
    `
      select f.id
      from followups f
      join tasks t on t.id = f.task_id
      where t.source_channel = $1 and t.source_message_id = $2 and t.ignored_at is null
    `,
    [sourceChannel, sourceMessageId],
  );

  const result = {
    sample,
    patchTask: await taskPatchResponse.json(),
    patchReminder: await reminderPatchResponse.json(),
    deleteFollowup: await followupDeleteResponse.json(),
    secondIngest: secondIngest.dedupe,
    reviewQueue: await queueResponse.json(),
    beforeSummary,
    afterSummary,
    persisted: {
      task: taskRows.rows[0] ?? null,
      reminders: reminderRows.rows,
      followups: followupRows.rows,
    },
  };

  console.log(JSON.stringify(result, null, 2));

  if (
    result.persisted.task?.title !== "레지너스 확인 일정 조정" ||
    result.persisted.task?.status !== "resolved" ||
    result.persisted.task?.priority !== "p1" ||
    result.persisted.task?.category !== "ops" ||
    result.persisted.task?.waiting_for !== "안소영" ||
    result.persisted.task?.related_project !== "자사몰 개편" ||
    result.persisted.reminders.length !== 1 ||
    result.persisted.reminders[0]?.status !== "done" ||
    result.persisted.followups.length !== 0 ||
    result.secondIngest.skipped !== 1
  ) {
    throw new Error("review verification failed");
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
