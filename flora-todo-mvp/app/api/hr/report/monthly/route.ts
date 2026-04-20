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

type FlatRow = {
  staffName: string;
  date: string;
  clockIn: string;
  clockOut: string;
  workMode: string;
  workMinutes: string;
  note: string;
};

function formatTime(date: Date): string {
  return toKSTTimeStr(date);
}

/**
 * 출퇴근 레코드를 일별 플랫 행으로 변환
 */
function buildFlatRows(
  staffName: string,
  workType: string,
  records: AttendanceRecord[],
): FlatRow[] {
  const dayMap = new Map<string, { clockIn: AttendanceRecord | null; clockOut: AttendanceRecord | null }>();
  const isDeemedHours = workType === "deemed_hours";

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

  const rows: FlatRow[] = [];
  const sortedDates = [...dayMap.keys()].sort();

  for (const date of sortedDates) {
    const { clockIn, clockOut } = dayMap.get(date)!;

    let workMinutes = "";
    if (isDeemedHours) {
      workMinutes = "-";
    } else if (clockIn && clockOut) {
      workMinutes = String(
        Math.round((clockOut.recordedAt.getTime() - clockIn.recordedAt.getTime()) / 60000),
      );
    }

    const workModeLabel =
      clockIn?.workMode === "office"
        ? "사무실"
        : clockIn?.workMode === "remote"
          ? "재택"
          : clockIn?.workMode === "field"
            ? "외근"
            : "";

    let note = "";
    if (isDeemedHours) {
      note = "시간계산 제외(간주근로)";
    } else if (clockIn && !clockOut) {
      note = "퇴근 미기록";
    }

    rows.push({
      staffName,
      date,
      clockIn: clockIn ? formatTime(clockIn.recordedAt) : "",
      clockOut: clockOut ? formatTime(clockOut.recordedAt) : "",
      workMode: workModeLabel,
      workMinutes,
      note,
    });
  }

  return rows;
}

/**
 * CSV 문자열 생성
 */
function buildCsv(rows: FlatRow[]): string {
  const header = "이름,일자,출근시각,퇴근시각,근무형태,근무시간(분),비고";
  const lines = rows.map((r) =>
    [r.staffName, r.date, r.clockIn, r.clockOut, r.workMode, r.workMinutes, r.note].join(","),
  );
  // BOM 추가 (Excel 한글 호환)
  return "\uFEFF" + [header, ...lines].join("\n");
}

/**
 * GET /api/hr/report/monthly
 *
 * 전직원 월간 리포트 (관리자/automation 전용)
 * - ?month=2026-04 (필수)
 * - ?format=json|csv (기본 json)
 *
 * csv: Content-Disposition 헤더로 파일 다운로드
 */
export async function GET(request: NextRequest) {
  try {
    const hrActor = await resolveHrActor(request);
    const isAutomation = isHrAutomationAuthorized(request);

    // 관리자 또는 automation key만 허용
    if (!hrActor?.isAdmin && !isAutomation) {
      return Response.json(
        { ok: false, error: "관리자 권한 필요" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const format = searchParams.get("format") ?? "json";

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return Response.json(
        { ok: false, error: "month 파라미터 필수 (형식: YYYY-MM)" },
        { status: 400 },
      );
    }

    if (!["json", "csv"].includes(format)) {
      return Response.json(
        { ok: false, error: "format은 'json' 또는 'csv'" },
        { status: 400 },
      );
    }

    // 전직원 데이터 조회
    const allRegistries = await hrEmployeeRegistryRepository.findAll();
    const allRecords = await hrAttendanceRepository.listByMonthAll(month);

    // staffId별로 레코드 그룹핑
    const recordsByStaff = new Map<string, AttendanceRecord[]>();
    for (const r of allRecords as AttendanceRecord[]) {
      if (!recordsByStaff.has(r.staffId)) {
        recordsByStaff.set(r.staffId, []);
      }
      recordsByStaff.get(r.staffId)!.push(r);
    }

    // 전직원 플랫 행 생성
    const allRows: FlatRow[] = [];
    const staffReports = allRegistries.map((reg) => {
      const staffRecords = recordsByStaff.get(reg.staffId) ?? [];
      const workType = reg.workType ?? "standard";
      const rows = buildFlatRows(reg.fullName, workType, staffRecords);
      allRows.push(...rows);

      return {
        staffId: reg.staffId,
        staffName: reg.fullName,
        department: reg.department,
        jobTitle: reg.jobTitle,
        workType,
        isDeemedHours: workType === "deemed_hours",
        totalDays: rows.length,
        rows,
      };
    });

    // CSV 출력
    if (format === "csv") {
      const csv = buildCsv(allRows);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="attendance-report-${month}.csv"`,
        },
      });
    }

    // JSON 출력
    return Response.json({
      ok: true,
      month,
      companyName: "프레스코21",
      reportType: "월간 출퇴근 리포트",
      generatedAt: new Date().toISOString(),
      totalStaff: allRegistries.length,
      staffReports,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
