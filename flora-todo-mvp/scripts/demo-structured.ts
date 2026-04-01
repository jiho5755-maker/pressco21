import { structureMemoText } from "../src/lib/structured-parser";

const referenceNow = process.env.REFERENCE_NOW ? new Date(process.env.REFERENCE_NOW) : new Date();
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

console.log("REFERENCE_NOW:", referenceNow.toISOString());

for (const sample of samples) {
  const structured = structureMemoText(sample, referenceNow);
  console.log("=".repeat(80));
  console.log("INPUT:", sample);
  console.log(
    JSON.stringify(
      {
        normalizedText: structured.normalizedText,
        segments: structured.segments.map((segment) => ({
          sourceSegment: segment.sourceSegment,
          task: {
            title: segment.task.title,
            status: segment.task.status,
            priority: segment.task.priority,
            dueAt: segment.task.dueAt,
            timeBucket: segment.task.timeBucket,
            waitingFor: segment.task.waitingFor,
            relatedProject: segment.task.relatedProject,
          },
          reminders: segment.reminders,
          followups: segment.followups,
          debug: segment.debug,
        })),
      },
      null,
      2,
    ),
  );
}
