import { NextRequest } from "next/server";
import { hrAttendanceRepository } from "@/src/db/repositories/hrAttendanceRepository";
import { hrEmployeeRegistryRepository } from "@/src/db/repositories/hrEmployeeRegistryRepository";
import { resolveHrActor, isHrAutomationAuthorized } from "@/src/lib/hr-auth";

type StaffStatus = {
  staffId: string;
  staffName: string;
  status: "working" | "done" | "not_yet" | "on_leave";
  clockInAt: string | null;
  clockOutAt: string | null;
  workMode: string | null;
};

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

/**
 * GET /api/hr/stats/today
 *
 * 오늘의 빠른 통계
 * - 전체 직원 수, 출근/퇴근/미출근/휴가 인원
 * - 직원별 상태 목록
 *
 * 모든 인증된 사용자 접근 가능
 */
export async function GET(request: NextRequest) {
  try {
    const hrActor = await resolveHrActor(request);
    const isAutomation = isHrAutomationAuthorized(request);

    if (!hrActor && !isAutomation) {
      return Response.json({ ok: false, error: "인증 실패" }, { status: 401 });
    }

    // 전체 활성 직원 목록
    const allStaff = await hrEmployeeRegistryRepository.findAll();

    // 오늘의 출퇴근 기록
    const todayRecords = await hrAttendanceRepository.getTodayAll();
    // 정정된 원본 제외
    const effective = todayRecords.filter((r) => r.correctedBy === null);

    // staffId별 오늘 기록 매핑
    const staffRecords = new Map<string, { clockIn: typeof effective[0] | null; clockOut: typeof effective[0] | null }>();
    for (const r of effective) {
      if (!staffRecords.has(r.staffId)) {
        staffRecords.set(r.staffId, { clockIn: null, clockOut: null });
      }
      const entry = staffRecords.get(r.staffId)!;
      if (r.type === "clock_in" && !entry.clockIn) {
        entry.clockIn = r;
      } else if (r.type === "clock_out" && !entry.clockOut) {
        entry.clockOut = r;
      }
    }

    // 직원별 상태 계산
    let clockedIn = 0;
    let clockedOut = 0;
    let notYet = 0;
    let onLeave = 0;

    const staffStatus: StaffStatus[] = allStaff.map((reg) => {
      const record = staffRecords.get(reg.staffId);

      // 비활성 직원 (출산휴가 등) — status가 'active'가 아닌 건 findAll()에서 이미 제외됨
      // separationDate가 있으면 휴직/휴가로 간주
      if (reg.separationDate && !reg.separationReason?.includes("퇴직")) {
        onLeave++;
        return {
          staffId: reg.staffId,
          staffName: reg.fullName,
          status: "on_leave" as const,
          clockInAt: null,
          clockOutAt: null,
          workMode: null,
        };
      }

      if (!record) {
        notYet++;
        return {
          staffId: reg.staffId,
          staffName: reg.fullName,
          status: "not_yet" as const,
          clockInAt: null,
          clockOutAt: null,
          workMode: null,
        };
      }

      if (record.clockOut) {
        clockedOut++;
        return {
          staffId: reg.staffId,
          staffName: reg.fullName,
          status: "done" as const,
          clockInAt: record.clockIn ? formatTime(record.clockIn.recordedAt) : null,
          clockOutAt: formatTime(record.clockOut.recordedAt),
          workMode: record.clockIn?.workMode ?? record.clockOut.workMode,
        };
      }

      if (record.clockIn) {
        clockedIn++;
        return {
          staffId: reg.staffId,
          staffName: reg.fullName,
          status: "working" as const,
          clockInAt: formatTime(record.clockIn.recordedAt),
          clockOutAt: null,
          workMode: record.clockIn.workMode,
        };
      }

      notYet++;
      return {
        staffId: reg.staffId,
        staffName: reg.fullName,
        status: "not_yet" as const,
        clockInAt: null,
        clockOutAt: null,
        workMode: null,
      };
    });

    const today = new Date().toISOString().slice(0, 10);

    return Response.json({
      ok: true,
      date: today,
      totalStaff: allStaff.length,
      clockedIn,
      clockedOut,
      notYet,
      onLeave,
      staffStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
