import "dotenv/config";
import { pool } from "../src/db/client";
import { ingestTextAsTask } from "../src/services/ingestService";
import { structureMemoText } from "../src/lib/structured-parser";

type VerificationRow = {
  source_message_id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  waiting_for: string | null;
  related_project: string | null;
  reminder_count: string;
  followup_count: string;
};

const sourceChannel = "verify-sprint2";
const samples = [
  {
    sourceMessageId: "summary-1",
    label: "single-action",
    text: "다음주 화요일 오후 2시 dedu 세팅 다시 해보기",
    expectedTaskCount: 1,
  },
  {
    sourceMessageId: "summary-2",
    label: "mixed-actions",
    text: "레지너스 답변 및 주문 마무리, 다음주 월요일 불량품 수거",
    expectedTaskCount: 3,
  },
  {
    sourceMessageId: "summary-3",
    label: "all-entities",
    text: "안소영 통해 레지너스 자사몰 개편 로고 개선안 회신 대기",
    expectedTaskCount: 1,
  },
];

async function main() {
  await pool.query("delete from tasks where source_channel = $1", [sourceChannel]);

  const previews = samples.map((sample) => ({
    label: sample.label,
    input: sample.text,
    preview: structureMemoText(sample.text).segments.map((segment) => ({
      sourceSegment: segment.sourceSegment,
      title: segment.task.title,
      status: segment.task.status,
      waitingFor: segment.task.waitingFor,
      relatedProject: segment.task.relatedProject,
      reminders: segment.reminders.length,
      followups: segment.followups.length,
    })),
  }));

  for (const sample of samples) {
    await ingestTextAsTask({
      sourceChannel,
      sourceMessageId: sample.sourceMessageId,
      text: sample.text,
    });
  }

  const rows = await pool.query<VerificationRow>(
    `
      select
        t.source_message_id,
        t.title,
        t.status,
        t.priority,
        t.due_at::text as due_at,
        t.waiting_for,
        t.related_project,
        cast(count(distinct r.id) as text) as reminder_count,
        cast(count(distinct f.id) as text) as followup_count
      from tasks t
      left join reminders r on r.task_id = t.id
      left join followups f on f.task_id = t.id
      where t.source_channel = $1 and t.ignored_at is null
      group by t.id, t.source_message_id, t.title, t.status, t.priority, t.due_at, t.waiting_for, t.related_project
      order by t.source_message_id, t.segment_index, t.created_at, t.title
    `,
    [sourceChannel],
  );

  const summaryByMessage = rows.rows.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.source_message_id] = (accumulator[row.source_message_id] ?? 0) + 1;
    return accumulator;
  }, {});

  const result = {
    previews,
    rows: rows.rows,
    summaryByMessage,
  };

  console.log(JSON.stringify(result, null, 2));

  const singleActionRow = rows.rows.find((row) => row.source_message_id === "summary-1");
  const entityRow = rows.rows.find((row) => row.source_message_id === "summary-3");
  const summaryMatches = samples.every((sample) => summaryByMessage[sample.sourceMessageId] === sample.expectedTaskCount);

  if (
    !summaryMatches ||
    singleActionRow?.title !== "dedu 세팅 다시 해보기" ||
    entityRow?.waiting_for !== "안소영" ||
    entityRow?.related_project !== "자사몰 개편"
  ) {
    throw new Error("sprint2 summary verification failed");
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
