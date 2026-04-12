import { NextRequest } from "next/server";
import { hrEmployeeRegistryRepository } from "@/src/db/repositories/hrEmployeeRegistryRepository";
import { hrAttendanceRepository } from "@/src/db/repositories/hrAttendanceRepository";
import { staffRepository } from "@/src/db/repositories/staffRepository";
import { isHrAutomationAuthorized } from "@/src/lib/hr-auth";

/**
 * GET /api/hr/attendance/unchecked
 *
 * 오늘 출근 미기록 직원 목록 (리마인더 WF용)
 * automation key 필수
 *
 * 반환: 출근 기록 없는 활성 직원 + 텔레그램 ID
 */
export async function GET(request: NextRequest) {
  if (!isHrAutomationAuthorized(request)) {
    return Response.json({ ok: false, error: "인증 실패" }, { status: 401 });
  }

  // 전체 활성 직원
  const activeEmployees = await hrEmployeeRegistryRepository.listActive();

  // 오늘 전체 출퇴근 기록
  const todayRecords = await hrAttendanceRepository.getTodayAll();
  const clockedInStaffIds = new Set(
    todayRecords
      .filter((r) => r.type === "clock_in")
      .map((r) => r.staffId),
  );

  // 미출근 직원 필터
  const unchecked = [];
  const allStaff = await staffRepository.listAll();
  const staffMap = new Map(allStaff.map((s) => [s.id, s]));

  for (const emp of activeEmployees) {
    if (clockedInStaffIds.has(emp.staffId)) continue;
    // 동의 미완료 직원은 리마인더 대상에서 제외
    if (!emp.privacyConsentAt) continue;

    const staffMember = staffMap.get(emp.staffId);
    unchecked.push({
      staffId: emp.staffId,
      staffName: emp.fullName,
      department: emp.department,
      telegramUserId: staffMember?.telegramUserId ?? null,
    });
  }

  return Response.json({ ok: true, unchecked, total: unchecked.length });
}
