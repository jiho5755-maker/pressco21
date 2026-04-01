import "dotenv/config";
import { ingestTextAsTask } from "../src/services/ingestService";
import { getTaskSummary } from "../src/services/summaryService";
import { pool } from "../src/db/client";

const samples = [
  "레지너스 답변 및 주문 마무리",
  "다음주 월요일 불량품 수거",
  "안소영 연락 대기",
  "수요일 화담숲 릴스 콘텐츠 진행",
  "이번주 안에 로켓배송 많이 등록",
  "로고 개선안 수신 대기",
  "부가세 처리 아직 못함",
  "다음주 화요일 오후 2시 사방넷 창고관리 교육 전에 세팅 다시 해보기",
  "큰누나 유튜브 마무리 가이드 주고 자사몰 상세페이지 주의사항도 같이 보기",
  "회의 후 정리: 안소영 회신 대기, 이번주 안에 자사몰 개편 먼저 확인",
  "레지너스 미팅 후 사방넷 설정 다시 확인하고 로고 개선안은 나중에 확인",
];

const sourceChannel = "demo-seed-sprint2";

async function main() {
  await pool.query("delete from tasks where source_channel = $1", [sourceChannel]);

  for (const [index, sample] of samples.entries()) {
    const result = await ingestTextAsTask({
      sourceChannel,
      sourceMessageId: `seed-${index + 1}`,
      text: sample,
    });

    console.log(
      JSON.stringify(
        {
          input: sample,
          createdTasks: result.created.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            dueAt: task.dueAt,
            waitingFor: task.waitingFor,
          })),
          createdReminders: result.created.reminders.map((reminder) => ({
            id: reminder.id,
            taskId: reminder.taskId,
            title: reminder.title,
            remindAt: reminder.remindAt,
            kind: reminder.kind,
          })),
          createdFollowups: result.created.followups.map((followup) => ({
            id: followup.id,
            taskId: followup.taskId,
            subject: followup.subject,
            status: followup.status,
            waitingFor: followup.waitingFor,
            nextCheckAt: followup.nextCheckAt,
          })),
        },
        null,
        2,
      ),
    );
  }

  console.log(
    JSON.stringify(
      {
        sourceChannel,
        summary: await getTaskSummary(),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
