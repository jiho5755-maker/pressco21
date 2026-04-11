/**
 * 근로자명부 초기 데이터 seed 스크립트
 * - staff 테이블에 누락된 직원 추가
 * - hr_employee_registry 에 전직원 8명 등록
 *
 * 실행: npx tsx scripts/seed-hr-registry.ts
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { staff, hrEmployeeRegistry } from "../src/db/schema";
import { pool } from "../src/db/client";

// 누락된 staff 레코드 (기존: jiho, jaehyuk, seunghae, wj, dagyeong)
const missingStaff = [
  { id: "staff-junhyuk", name: "장준혁", role: "staff" },
  { id: "staff-hyangja", name: "서향자", role: "staff" },
  { id: "staff-hyeja", name: "이혜자", role: "staff" },
  { id: "staff-songmi", name: "송미", role: "staff" },
];

// 전직원 근로자명부 데이터 (근기법 제41조 + 시행령 제20조)
const registryData = [
  {
    staffId: "staff-dagyeong",
    fullName: "장다경",
    jobTitle: "팀장",
    department: "디자인기획팀",
    jobDescription:
      "브랜드 디자인 및 유튜브 등 영상 콘텐츠 기획·촬영·편집 업무 전반 (유일 담당자)",
    hireDate: "2022-08-21",
    contractType: "permanent" as const,
    workType: "deemed_hours" as const,
  },
  {
    staffId: "staff-jiho",
    fullName: "장지호",
    jobTitle: "팀장",
    department: "전략기획팀",
    jobDescription:
      "시스템 개발, IT 인프라 관리, 자동화 구축, 사업 기획",
    hireDate: "2024-01-02",
    contractType: "permanent" as const,
    workType: "standard" as const,
  },
  {
    staffId: "staff-junhyuk",
    fullName: "장준혁",
    jobTitle: "부장",
    department: "경영지원",
    jobDescription: "경영관리 총괄",
    hireDate: "2023-01-02",
    contractType: "permanent" as const,
    workType: "standard" as const,
  },
  {
    staffId: "staff-jaehyuk",
    fullName: "이재혁",
    jobTitle: "과장",
    department: "물류운영팀",
    jobDescription:
      "물류운영 총괄 (입출고, 재고관리, 배송, CS)",
    hireDate: "2024-01-01",
    contractType: "permanent" as const,
    workType: "inclusive_wage" as const,
  },
  {
    staffId: "staff-hyangja",
    fullName: "서향자",
    jobTitle: "실장",
    department: "경영지원",
    jobDescription: "경영 지원 업무 (촉탁)",
    hireDate: "2024-01-01",
    contractType: "contract" as const,
    workType: "inclusive_wage" as const,
  },
  {
    staffId: "staff-hyeja",
    fullName: "이혜자",
    jobTitle: "대리",
    department: "물류운영팀",
    jobDescription: "물류 운영 지원, 주문 처리",
    hireDate: "2024-01-01",
    contractType: "permanent" as const,
    workType: "inclusive_wage" as const,
  },
  {
    staffId: "staff-songmi",
    fullName: "송미",
    jobTitle: "대리",
    department: "디자인기획팀",
    jobDescription: "디자인 지원, 콘텐츠 보조",
    hireDate: "2024-06-01",
    contractType: "permanent" as const,
    workType: "deemed_hours" as const,
  },
  {
    staffId: "staff-seunghae",
    fullName: "조승해",
    jobTitle: "사원",
    department: "디자인기획팀",
    jobDescription: "디자인 지원, 콘텐츠 보조 (송미 대체인력, 동일 처우)",
    hireDate: "2025-06-01",
    contractType: "permanent" as const,
    workType: "deemed_hours" as const,
  },
];

async function main() {
  console.log("=== HR 근로자명부 seed 시작 ===\n");

  // 1) 누락 staff 추가
  for (const s of missingStaff) {
    const [existing] = await db
      .select()
      .from(staff)
      .where(eq(staff.id, s.id))
      .limit(1);

    if (existing) {
      console.log(`  [skip] staff '${s.name}' 이미 존재`);
    } else {
      await db.insert(staff).values({
        id: s.id,
        name: s.name,
        role: s.role,
      });
      console.log(`  [add]  staff '${s.name}' 추가됨`);
    }
  }

  console.log("");

  // 2) 근로자명부 등록
  for (const entry of registryData) {
    const [existing] = await db
      .select()
      .from(hrEmployeeRegistry)
      .where(eq(hrEmployeeRegistry.staffId, entry.staffId))
      .limit(1);

    if (existing) {
      console.log(`  [skip] registry '${entry.fullName}' 이미 존재`);
      continue;
    }

    await db.insert(hrEmployeeRegistry).values({
      id: randomUUID(),
      staffId: entry.staffId,
      fullName: entry.fullName,
      jobTitle: entry.jobTitle,
      department: entry.department,
      jobDescription: entry.jobDescription,
      hireDate: entry.hireDate,
      contractType: entry.contractType,
      workType: entry.workType,
      status: "active",
    });
    console.log(`  [add]  registry '${entry.fullName}' 등록됨 (${entry.workType})`);
  }

  console.log("\n=== 완료 ===");
  await pool.end();
}

main().catch((err) => {
  console.error("seed 실패:", err);
  pool.end();
  process.exit(1);
});
