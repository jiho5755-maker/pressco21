import { structureMemoText } from "../src/lib/structured-parser";

const referenceNow = new Date("2026-04-02T09:00:00+09:00");

const scenarios = [
  {
    label: "slash-separated memo",
    input: "메모: 내일 오후 3시 세금계산서 확인 / 레지너스 회신 대기 / 금요일까지 배너 수정",
    expect(segments: ReturnType<typeof structureMemoText>["segments"]) {
      return (
        segments.length === 3 &&
        segments[0]?.task.title === "세금계산서 확인" &&
        segments[0]?.task.dueAt?.toISOString() === "2026-04-03T06:00:00.000Z" &&
        segments[1]?.task.status === "waiting" &&
        segments[1]?.task.waitingFor === "레지너스" &&
        segments[2]?.task.title === "배너 수정"
      );
    },
  },
  {
    label: "month-day schedule",
    input: "4월 10일 오후 2시 미팅 준비",
    expect(segments: ReturnType<typeof structureMemoText>["segments"]) {
      return (
        segments.length === 1 &&
        segments[0]?.task.title === "미팅 준비" &&
        segments[0]?.task.dueAt?.toISOString() === "2026-04-10T05:00:00.000Z"
      );
    },
  },
  {
    label: "relative-day schedule",
    input: "모레 오전 11시 거래처 전화",
    expect(segments: ReturnType<typeof structureMemoText>["segments"]) {
      return (
        segments.length === 1 &&
        segments[0]?.task.title === "거래처 전화" &&
        segments[0]?.task.dueAt?.toISOString() === "2026-04-04T02:00:00.000Z"
      );
    },
  },
  {
    label: "weekend prep",
    input: "주말 전에 샘플 발주 체크",
    expect(segments: ReturnType<typeof structureMemoText>["segments"]) {
      return (
        segments.length === 1 &&
        segments[0]?.task.title === "샘플 발주 체크" &&
        segments[0]?.task.dueAt?.toISOString() === "2026-04-03T09:00:00.000Z" &&
        segments[0]?.reminders[0]?.kind === "prep"
      );
    },
  },
  {
    label: "contextual today heading",
    input: "오늘 할 일: 안소영 답변, 사방넷 세팅 다시 확인; 로고 개선안은 나중에 확인",
    expect(segments: ReturnType<typeof structureMemoText>["segments"]) {
      return (
        segments.length === 3 &&
        segments.every((segment) => segment.task.timeBucket === "today") &&
        segments[0]?.task.title === "안소영 답변" &&
        segments[1]?.task.title === "사방넷 세팅 다시 확인" &&
        segments[2]?.followups[0]?.sourceSignal === "나중에 확인"
      );
    },
  },
  {
    label: "bullet meeting memo",
    input: "회의 메모\n- 내일 오전 10시 입금 확인\n- 금요일 전까지 배송 공지\n- 레지너스 견적 회신 대기",
    expect(segments: ReturnType<typeof structureMemoText>["segments"]) {
      return (
        segments.length === 3 &&
        segments[0]?.task.title === "입금 확인" &&
        segments[1]?.task.title === "배송 공지" &&
        segments[2]?.task.waitingFor === "레지너스"
      );
    },
  },
];

const results = scenarios.map((scenario) => {
  const structured = structureMemoText(scenario.input, referenceNow);

  return {
    label: scenario.label,
    input: scenario.input,
    segments: structured.segments.map((segment) => ({
      sourceSegment: segment.sourceSegment,
      title: segment.task.title,
      status: segment.task.status,
      dueAt: segment.task.dueAt?.toISOString() ?? null,
      waitingFor: segment.task.waitingFor,
      reminderKinds: segment.reminders.map((reminder) => reminder.kind),
      followupSignals: segment.followups.map((followup) => followup.sourceSignal),
    })),
    ok: scenario.expect(structured.segments),
  };
});

console.log(
  JSON.stringify(
    {
      referenceNow: referenceNow.toISOString(),
      results,
    },
    null,
    2,
  ),
);

if (results.some((result) => !result.ok)) {
  throw new Error("freeform parsing verification failed");
}
