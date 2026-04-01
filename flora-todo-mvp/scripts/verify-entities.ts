import { structureMemoText } from "../src/lib/structured-parser";

const referenceNow = new Date("2026-04-02T00:00:00+09:00");
const samples = [
  "안소영 연락 대기",
  "레지너스 답변 및 주문 마무리",
  "다음주 화요일 오후 2시 사방넷 창고관리 교육 전에 세팅 다시 해보기",
  "화담숲 릴스 콘텐츠 먼저 확인",
  "자사몰 개편 관련 로고 개선안 수신 대기",
];

for (const sample of samples) {
  const structured = structureMemoText(sample, referenceNow);
  console.log("=".repeat(80));
  console.log("INPUT:", sample);
  console.log(
    JSON.stringify(
      structured.segments.map((segment) => ({
        sourceSegment: segment.sourceSegment,
        title: segment.task.title,
        waitingFor: segment.task.waitingFor,
        relatedProject: segment.task.relatedProject,
        entities: segment.debug.entities,
      })),
      null,
      2,
    ),
  );
}
