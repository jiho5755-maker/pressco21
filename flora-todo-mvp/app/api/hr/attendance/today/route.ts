import { NextRequest } from "next/server";
import { hrAttendanceRepository } from "@/src/db/repositories/hrAttendanceRepository";
import { resolveHrActor, isHrAutomationAuthorized } from "@/src/lib/hr-auth";

/**
 * GET /api/hr/attendance/today?staffId=xxx
 * 오늘의 출퇴근 상태 (미니앱 대시보드용)
 *
 * staffId 생략 시 → 전직원 현황 (관리자/automation만)
 */
export async function GET(request: NextRequest) {
  const hrActor = await resolveHrActor(request);
  const isAutomation = isHrAutomationAuthorized(request);

  if (!hrActor && !isAutomation) {
    return Response.json({ ok: false, error: "인증 실패" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedStaffId = searchParams.get("staffId");

  // 특정 직원 조회
  if (requestedStaffId) {
    // 일반 직원은 본인만
    if (hrActor && !hrActor.isAdmin && !isAutomation && requestedStaffId !== hrActor.staffId) {
      return Response.json({ ok: false, error: "권한 없음" }, { status: 403 });
    }
    const records = await hrAttendanceRepository.getTodayByStaffId(requestedStaffId);
    const clockIn = records.find((r) => r.type === "clock_in");
    const clockOut = records.find((r) => r.type === "clock_out");
    return Response.json({
      ok: true,
      staffId: requestedStaffId,
      clockIn: clockIn ?? null,
      clockOut: clockOut ?? null,
      records,
    });
  }

  // 본인 조회 (staffId 생략)
  if (hrActor) {
    const records = await hrAttendanceRepository.getTodayByStaffId(hrActor.staffId);
    const clockIn = records.find((r) => r.type === "clock_in");
    const clockOut = records.find((r) => r.type === "clock_out");
    return Response.json({
      ok: true,
      staffId: hrActor.staffId,
      clockIn: clockIn ?? null,
      clockOut: clockOut ?? null,
      records,
    });
  }

  // automation: 전직원 현황
  if (isAutomation) {
    const records = await hrAttendanceRepository.getTodayAll();
    return Response.json({ ok: true, records });
  }

  return Response.json({ ok: false, error: "staffId 필수" }, { status: 400 });
}
