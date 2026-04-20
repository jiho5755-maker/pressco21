import { NextRequest } from "next/server";
import { hrAttendanceRepository } from "@/src/db/repositories/hrAttendanceRepository";
import { hrEmployeeRegistryRepository } from "@/src/db/repositories/hrEmployeeRegistryRepository";
import { resolveHrActor, isHrAutomationAuthorized } from "@/src/lib/hr-auth";
import { toKSTDateKey, toKSTTimeStr } from "@/src/lib/hr-time";

type AttendanceRecord = {
  id: string;
  staffId: string;
  staffName: string;
  type: string;
  workMode: string;
  isDeemedHours: boolean;
  recordedAt: Date;
  clientTime: string | null;
  source: string;
  telegramMsgId: string | null;
  locationDetail: string | null;
  note: string | null;
  correctedBy: string | null;
  createdAt: Date;
};

type DailyRecord = {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  workMode: string;
  workMinutes: number | null;
};

/**
 * 일별 출퇴근 쌍을 매칭하여 근무시간 계산
 */
function buildDailyRecords(records: AttendanceRecord[]): DailyRecord[] {
  const dayMap = new Map<string, { clockIn: AttendanceRecord | null; clockOut: AttendanceRecord | null }>();

  for (const r of records) {
    const dateKey = toKSTDateKey(r.recordedAt);
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, { clockIn: null, clockOut: null });
    }
    const day = dayMap.get(dateKey)!;
    if (r.type === "clock_in" && !day.clockIn) {
      day.clockIn = r;
    } else if (r.type === "clock_out" && !day.clockOut) {
      day.clockOut = r;
    }
  }

  const result: DailyRecord[] = [];
  for (const [date, { clockIn, clockOut }] of dayMap) {
    let workMinutes: number | null = null;
    if (clockIn && clockOut) {
      workMinutes = Math.round(
        (clockOut.recordedAt.getTime() - clockIn.recordedAt.getTime()) / 60000,
      );
    }

    result.push({
      date,
      clockIn: clockIn ? formatTime(clockIn.recordedAt) : null,
      clockOut: clockOut ? formatTime(clockOut.recordedAt) : null,
      workMode: clockIn?.workMode ?? clockOut?.workMode ?? "office",
      workMinutes,
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

function formatTime(date: Date): string {
  return toKSTTimeStr(date);
}

/**
 * 일별 기록으로부터 요약 통계 생성
 */
function buildSummary(
  staffId: string,
  staffName: string,
  workType: string,
  isDeemedHours: boolean,
  dailyRecords: DailyRecord[],
) {
  let attendedDays = 0;
  let lateDays = 0;
  let officeDays = 0;
  let remoteDays = 0;
  let fieldDays = 0;
  let totalWorkMinutes = 0;
  let countedDays = 0;

  for (const day of dailyRecords) {
    if (day.clockIn) {
      attendedDays++;

      // 근무 형태별 집계
      if (day.workMode === "office") officeDays++;
      else if (day.workMode === "remote") remoteDays++;
      else if (day.workMode === "field") fieldDays++;

      // 지각 판단 (09:10 이후 출근)
      if (day.clockIn > "09:10") {
        lateDays++;
      }

      // 근무시간 집계 (isDeemedHours가 아닌 경우만)
      if (!isDeemedHours && day.workMinutes !== null) {
        totalWorkMinutes += day.workMinutes;
        countedDays++;
      }
    }
  }

  // 해당 월의 영업일(주말 제외) 계산
  const totalWorkDays = dailyRecords.length;
  const absentDays = Math.max(0, totalWorkDays - attendedDays);
  const avgWorkMinutes = isDeemedHours
    ? null
    : countedDays > 0
      ? Math.round(totalWorkMinutes / countedDays)
      : 0;

  return {
    staffId,
    staffName,
    workType,
    isDeemedHours,
    totalWorkDays,
    attendedDays,
    absentDays,
    lateDays,
    officeDays,
    remoteDays,
    fieldDays,
    avgWorkMinutes,
    avgWorkMinutesNote: isDeemedHours ? "시간계산 제외(보고 기반)" : null,
    dailyRecords,
  };
}

/**
 * GET /api/hr/attendance/monthly-summary
 *
 * 월간 출퇴근 요약 조회
 * - ?month=2026-04 (필수)
 * - ?staffId=xxx (선택, 관리자만 다른 직원 조회 가능)
 *
 * 일반 직원: 본인만 조회
 * 관리자/automation: staffId 없이 호출 시 전직원 요약 반환
 */
export async function GET(request: NextRequest) {
  try {
    const hrActor = await resolveHrActor(request);
    const isAutomation = isHrAutomationAuthorized(request);

    if (!hrActor && !isAutomation) {
      return Response.json({ ok: false, error: "인증 실패" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return Response.json(
        { ok: false, error: "month 파라미터 필수 (형식: YYYY-MM)" },
        { status: 400 },
      );
    }

    const requestedStaffId = searchParams.get("staffId");
    const isAdmin = hrActor?.isAdmin || isAutomation;

    // 일반 직원이 다른 직원을 조회하려는 경우
    if (!isAdmin && requestedStaffId && requestedStaffId !== hrActor?.staffId) {
      return Response.json(
        { ok: false, error: "본인 기록만 조회 가능합니다" },
        { status: 403 },
      );
    }

    // 특정 직원 조회
    if (requestedStaffId || (!isAdmin && hrActor)) {
      const staffId = requestedStaffId ?? hrActor!.staffId;
      const registry = await hrEmployeeRegistryRepository.findByStaffId(staffId);
      const records = await hrAttendanceRepository.listByMonth(staffId, month);
      const dailyRecords = buildDailyRecords(records as AttendanceRecord[]);
      const workType = registry?.workType ?? "standard";
      const isDeemedHours = workType === "deemed_hours";

      const summary = buildSummary(
        staffId,
        registry?.fullName ?? hrActor?.staffName ?? staffId,
        workType,
        isDeemedHours,
        dailyRecords,
      );

      return Response.json({
        ok: true,
        month,
        staffSummaries: [summary],
      });
    }

    // 관리자: 전직원 요약
    const allRegistries = await hrEmployeeRegistryRepository.findAll();
    const allRecords = await hrAttendanceRepository.listByMonthAll(month);
    const recordsByStaff = new Map<string, AttendanceRecord[]>();

    for (const r of allRecords as AttendanceRecord[]) {
      if (!recordsByStaff.has(r.staffId)) {
        recordsByStaff.set(r.staffId, []);
      }
      recordsByStaff.get(r.staffId)!.push(r);
    }

    const staffSummaries = allRegistries.map((reg) => {
      const staffRecords = recordsByStaff.get(reg.staffId) ?? [];
      const dailyRecords = buildDailyRecords(staffRecords);
      const workType = reg.workType ?? "standard";
      const isDeemedHours = workType === "deemed_hours";

      return buildSummary(
        reg.staffId,
        reg.fullName,
        workType,
        isDeemedHours,
        dailyRecords,
      );
    });

    return Response.json({
      ok: true,
      month,
      staffSummaries,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
