import "dotenv/config";
import { pool } from "../src/db/client";
import { ingestTextAsTask } from "../src/services/ingestService";
import { getTaskSummary } from "../src/services/summaryService";
import { structureMemoText } from "../src/lib/structured-parser";

type VerificationRow = {
  source_message_id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  waiting_for: string | null;
  reminder_count: string;
  followup_count: string;
};

const samples = [
  "레지너스 답변 및 주문 마무리",
  "다음주 월요일 불량품 수거",
  "안소영 연락 대기",
  "수요일 화담숲 릴스 콘텐츠 진행",
  "이번주 안에 로켓배송 많이 등록",
  "로고 개선안 수신 대기",
  "부가세 처리 아직 못함",
  "다음주 화요일 오후 2시 사방넷 창고관리 교육 전에 세팅 다시 해보기",
];

const mixedMemo = "레지너스 답변 및 주문 마무리\n다음주 월요일 불량품 수거, 안소영 연락 대기";
const sourceChannel = "verify-sprint2";

async function main() {
  console.log("REFERENCE_NOW", new Date().toISOString());
  console.log("STRUCTURE_PREVIEW");

  for (const sample of [...samples, mixedMemo]) {
    const structured = structureMemoText(sample);

    console.log(
      JSON.stringify(
        {
          input: sample,
          segments: structured.segments.map((segment) => ({
            sourceSegment: segment.sourceSegment,
            title: segment.task.title,
            status: segment.task.status,
            priority: segment.task.priority,
            dueAt: segment.task.dueAt,
            waitingFor: segment.task.waitingFor,
            reminders: segment.reminders.map((reminder) => ({
              title: reminder.title,
              remindAt: reminder.remindAt,
              kind: reminder.kind,
            })),
            followups: segment.followups.map((followup) => ({
              subject: followup.subject,
              status: followup.status,
              waitingFor: followup.waitingFor,
              nextCheckAt: followup.nextCheckAt,
            })),
          })),
        },
        null,
        2,
      ),
    );
  }

  await pool.query("delete from tasks where source_channel = $1", [sourceChannel]);

  for (const [index, sample] of [...samples, mixedMemo].entries()) {
    await ingestTextAsTask({
      sourceChannel,
      sourceMessageId: `verify-${index + 1}`,
      text: sample,
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
        cast(count(distinct r.id) as text) as reminder_count,
        cast(count(distinct f.id) as text) as followup_count
      from tasks t
      left join reminders r on r.task_id = t.id
      left join followups f on f.task_id = t.id
      where t.source_channel = $1
      group by t.id, t.source_message_id, t.title, t.status, t.priority, t.due_at, t.waiting_for
      order by t.source_message_id, t.created_at, t.title
    `,
    [sourceChannel],
  );

  console.log("DB_ROWS");
  console.log(JSON.stringify(rows.rows, null, 2));
  console.log("SUMMARY");
  console.log(JSON.stringify(await getTaskSummary(), null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
