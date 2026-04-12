import { NextRequest } from "next/server";
import { hrAttendanceRepository } from "@/src/db/repositories/hrAttendanceRepository";
import { hrEmployeeRegistryRepository } from "@/src/db/repositories/hrEmployeeRegistryRepository";
import { staffRepository } from "@/src/db/repositories/staffRepository";
import { resolveHrActor, isHrAutomationAuthorized } from "@/src/lib/hr-auth";

/**
 * POST /api/hr/attendance — 출퇴근/업무보고 기록
 *
 * n8n WF(텔레그램 봇)에서 호출: automation key + body.staffId 또는 body.telegramUserId
 * 미니앱에서 호출: telegram initData → 자동 staffId
 *
 * 동의 미완료 시 403 { needsConsent: true } 반환
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

      const record = await hrAttendanceRepository.create({
        staffId,
        staffName: resolvedName,
        type,
        workMode,
        isDeemedHours,
        clientTime: body.clientTime,
        source: body.source ?? "telegram",
        telegramMsgId: body.telegramMsgId,
        locationDetail: body.locationDetail,
        note: body.note,
        actorId: staffId,
        actorName: resolvedName,
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
