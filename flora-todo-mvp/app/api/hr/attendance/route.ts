import { NextRequest } from "next/server";
import { hrAttendanceRepository } from "@/src/db/repositories/hrAttendanceRepository";
import { hrEmployeeRegistryRepository } from "@/src/db/repositories/hrEmployeeRegistryRepository";
import { staffRepository } from "@/src/db/repositories/staffRepository";
import { resolveHrActor, isHrAutomationAuthorized } from "@/src/lib/hr-auth";
import { toKSTDateKey } from "@/src/lib/hr-time";

type ClockType = "clock_in" | "clock_out";

function parseManualTime(manualTime: string): Date | null {
  const match = manualTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  const todayKST = toKSTDateKey(new Date());
  return new Date(todayKST + "T" + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":00+09:00");
}

// 오늘 이미 찍힌 기록을 기준으로 상태 전이 가능 여부 판단
// 중복 방지 상태머신: 출근 전 | 출근 후 | 퇴근 완료
async function validateStateTransition(staffId: string, type: ClockType) {
  const todayRecords = await hrAttendanceRepository.getTodayByStaffId(staffId);
  // 정정된 원본은 무시 (correctedBy !== null 인 건 이미 대체됨)
  const effective = todayRecords.filter((r) => r.correctedBy === null);
  const clockIn = effective.find((r) => r.type === "clock_in");
  const clockOut = effective.find((r) => r.type === "clock_out");

  if (type === "clock_in") {
    if (clockOut) {
      return {
        status: 409,
        body: {
          ok: false,
          error: "already_clocked_out",
          message: "오늘 이미 퇴근까지 완료되었습니다. 재출근은 관리자(장지호) 정정 요청이 필요합니다.",
          existingRecord: clockOut,
        },
      };
    }
    if (clockIn) {
      return {
        status: 409,
        body: {
          ok: false,
          error: "already_clocked_in",
          message: "이미 출근 기록이 있습니다.",
          existingRecord: clockIn,
        },
      };
    }
  } else {
    if (!clockIn) {
      return {
        status: 422,
        body: {
          ok: false,
          error: "needs_clock_in",
          message: "출근 기록이 없습니다. '8:30 출근' 형태로 출근 시각을 먼저 보내주세요.",
        },
      };
    }
    if (clockOut) {
      return {
        status: 409,
        body: {
          ok: false,
          error: "already_clocked_out",
          message: "이미 퇴근 기록이 있습니다.",
          existingRecord: clockOut,
        },
      };
    }
  }
  return null;
}

/**
 * POST /api/hr/attendance — 출퇴근/업무보고 기록
 *
 * n8n WF(텔레그램 봇)에서 호출: automation key + body.staffId 또는 body.telegramUserId
 * 미니앱에서 호출: telegram initData → 자동 staffId
 *
 * 동의 미완료 시 403 { needsConsent: true } 반환
 * 중복 기록 시 409 (already_clocked_in / already_clocked_out) 반환
 * 퇴근 선행 시 422 (needs_clock_in) 반환
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const type = body.type as "clock_in" | "clock_out";
    const workMode = body.workMode as "office" | "remote" | "field";

    if (!type || !["clock_in", "clock_out"].includes(type)) {
      return Response.json(
        { ok: false, error: "type은 'clock_in' 또는 'clock_out' 필수" },
        { status: 400 },
      );
    }
    if (!workMode || !["office", "remote", "field"].includes(workMode)) {
      return Response.json(
        { ok: false, error: "workMode는 'office', 'remote', 'field' 중 하나 필수" },
        { status: 400 },
      );
    }

    // 인증 경로 1: 미니앱 (Telegram initData)
    const hrActor = await resolveHrActor(request);
    if (hrActor) {
      const registry =
        await hrEmployeeRegistryRepository.findByStaffId(hrActor.staffId);
      if (registry && !registry.privacyConsentAt) {
        return Response.json(
          {
            ok: false,
            error: "개인정보 동의 필요",
            needsConsent: true,
            staffId: hrActor.staffId,
            staffName: hrActor.staffName,
          },
          { status: 403 },
        );
      }

      const stateError = await validateStateTransition(hrActor.staffId, type);
      if (stateError) {
        return Response.json(stateError.body, { status: stateError.status });
      }

      const record = await hrAttendanceRepository.create({
        staffId: hrActor.staffId,
        staffName: hrActor.staffName,
        type,
        workMode,
        isDeemedHours: hrActor.isDeemedHours,
        clientTime: body.clientTime,
        source: "miniapp",
        locationDetail: body.locationDetail,
        note: body.note,
        actorId: hrActor.staffId,
        actorName: hrActor.staffName,
      });
      return Response.json(
        { ok: true, record, isDeemedHours: hrActor.isDeemedHours, staffName: hrActor.staffName },
        { status: 201 },
      );
    }

    // 인증 경로 2: n8n WF (automation key + staffId 또는 telegramUserId)
    if (isHrAutomationAuthorized(request)) {
      let staffId = body.staffId as string | undefined;
      let staffName = body.staffName ?? "unknown";

      // telegramUserId로 직원 식별 (staffId 없을 때)
      if (!staffId && body.telegramUserId) {
        const staffMember = await staffRepository.findByTelegramUserId(
          String(body.telegramUserId),
        );
        if (!staffMember) {
          return Response.json(
            { ok: false, error: "등록되지 않은 직원입니다" },
            { status: 404 },
          );
        }
        staffId = staffMember.id;
        staffName = staffMember.name;
      }

      if (!staffId) {
        return Response.json(
          { ok: false, error: "staffId 또는 telegramUserId 필수" },
          { status: 400 },
        );
      }

      const registry =
        await hrEmployeeRegistryRepository.findByStaffId(staffId);
      const resolvedName = registry?.fullName ?? staffName;
      const isDeemedHours = registry?.workType === "deemed_hours";

      // 동의 확인
      if (registry && !registry.privacyConsentAt) {
        return Response.json(
          {
            ok: false,
            error: "개인정보 동의 필요",
            needsConsent: true,
            staffId,
            staffName: resolvedName,
          },
          { status: 403 },
        );
      }

      let manualRecordedAt: Date | undefined;
      if (body.manualTime) {
        const parsed = parseManualTime(body.manualTime);
        if (!parsed) {
          return Response.json(
            { ok: false, error: "시간 형식 오류 (HH:MM)" },
            { status: 400 },
          );
        }
        const todayKST = toKSTDateKey(new Date());
        const parsedDateKST = toKSTDateKey(parsed);
        if (parsedDateKST !== todayKST) {
          return Response.json(
            { ok: false, error: "당일 내에만 자가 수정이 가능합니다. 다른 날짜는 관리자에게 요청하세요." },
            { status: 400 },
          );
        }
        manualRecordedAt = parsed;
      }

      const stateError = await validateStateTransition(staffId, type);
      if (stateError) {
        return Response.json(stateError.body, { status: stateError.status });
      }

      const record = await hrAttendanceRepository.create({
        staffId,
        staffName: resolvedName,
        type,
        workMode,
        isDeemedHours,
        clientTime: body.clientTime,
        source: manualRecordedAt ? "self_correct" : (body.source ?? "telegram"),
        telegramMsgId: body.telegramMsgId,
        locationDetail: body.locationDetail,
        note: manualRecordedAt ? (body.note ?? "자가 시각 정정") : body.note,
        actorId: staffId,
        actorName: resolvedName,
        recordedAt: manualRecordedAt,
      });
      return Response.json(
        { ok: true, record, isDeemedHours, staffName: resolvedName },
        { status: 201 },
      );
    }

    return Response.json(
      { ok: false, error: "인증 실패" },
      { status: 401 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * GET /api/hr/attendance?staffId=xxx&month=2026-04
 * 월별 출퇴근 내역 조회
 */
export async function GET(request: NextRequest) {
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

  // 일반 직원은 본인만 조회
  const requestedStaffId = searchParams.get("staffId");
  const staffId =
    hrActor && !hrActor.isAdmin && !isAutomation
      ? hrActor.staffId
      : requestedStaffId ?? hrActor?.staffId;

  if (!staffId) {
    return Response.json(
      { ok: false, error: "staffId 필수" },
      { status: 400 },
    );
  }

  const records = await hrAttendanceRepository.listByMonth(staffId, month);
  return Response.json({ ok: true, records });
}
