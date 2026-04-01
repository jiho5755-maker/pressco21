import "dotenv/config";
import { ingestTextAsTask } from "../src/services/ingestService";

const samples = [
  "레지너스 답변 및 주문 마무리",
  "다음주 월요일 불량품 수거",
  "안소영 연락 대기",
  "수요일 화담숲 릴스 콘텐츠 진행",
  "이번주 안에 로켓배송 많이 등록",
  "로고 개선안 수신 대기",
];

async function main() {
  for (const [index, sample] of samples.entries()) {
    const result = await ingestTextAsTask({
      sourceChannel: "demo-seed",
      sourceMessageId: `seed-${index + 1}`,
      text: sample,
    });

    console.log(
      JSON.stringify(
        {
          input: sample,
          createdTasks: result.created.tasks.length,
          createdReminders: result.created.reminders.length,
          createdFollowups: result.created.followups.length,
        },
        null,
        2,
      ),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
