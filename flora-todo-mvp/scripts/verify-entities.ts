import { structureMemoText } from "../src/lib/structured-parser";

const referenceNow = new Date("2026-04-02T00:00:00+09:00");
const cases = [
  {
    input: "안소영 연락 대기",
    expected: {
      waitingFor: "안소영",
      relatedProject: null,
      people: ["안소영"],
      companies: [],
      projects: [],
    },
  },
  {
    input: "다음주 화요일 오후 2시 사방넷 창고관리 교육 전에 세팅 다시 해보기",
    expected: {
      waitingFor: null,
      relatedProject: "사방넷 창고관리 교육",
      people: [],
      companies: ["사방넷"],
      projects: ["사방넷 창고관리 교육"],
    },
  },
  {
    input: "자사몰 개편 관련 로고 개선안 수신 대기",
    expected: {
      waitingFor: "자사몰 개편",
      relatedProject: "자사몰 개편",
      people: [],
      companies: [],
      projects: ["자사몰 개편", "로고 개선안"],
    },
  },
  {
    input: "안소영 통해 레지너스 자사몰 개편 로고 개선안 회신 대기",
    expected: {
      waitingFor: "안소영",
      relatedProject: "자사몰 개편",
      people: ["안소영"],
      companies: ["레지너스"],
      projects: ["자사몰 개편", "로고 개선안"],
    },
  },
];

const mismatches: Array<{
  input: string;
  actual: unknown;
  expected: unknown;
}> = [];

for (const testCase of cases) {
  const structured = structureMemoText(testCase.input, referenceNow);
  const firstSegment = structured.segments[0];
  const actual = {
    waitingFor: firstSegment?.task.waitingFor ?? null,
    relatedProject: firstSegment?.task.relatedProject ?? null,
    people: firstSegment?.debug.entities.people ?? [],
    companies: firstSegment?.debug.entities.companies ?? [],
    projects: firstSegment?.debug.entities.projects ?? [],
  };

  console.log("=".repeat(80));
  console.log("INPUT:", testCase.input);
  console.log(JSON.stringify(actual, null, 2));

  if (JSON.stringify(actual) !== JSON.stringify(testCase.expected)) {
    mismatches.push({
      input: testCase.input,
      actual,
      expected: testCase.expected,
    });
  }
}

if (mismatches.length > 0) {
  console.error("ENTITY_MISMATCHES");
  console.error(JSON.stringify(mismatches, null, 2));
  process.exitCode = 1;
}
