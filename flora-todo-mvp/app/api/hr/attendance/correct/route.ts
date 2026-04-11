import { NextRequest } from "next/server";
import { hrAttendanceRepository } from "@/src/db/repositories/hrAttendanceRepository";
import { hrEmployeeRegistryRepository } from "@/src/db/repositories/hrEmployeeRegistryRepository";
import { resolveHrActor, isHrAutomationAuthorized } from "@/src/lib/hr-auth";

/**
 * POST /api/hr/attendance/correct — 출퇴근 기록 정정 (관리자 전용)
 *
 * body: { originalId, type, workMode, reason, staffId? }
 */
export async function POST(request: NextRequest) {
  const hrActor = await resolveHrActor(request);
  const isAutomation = isHrAutomationAuthorized(request);

  if (!hrActor?.isAdmin && !isAutomation) {
    return Response.json(
      { ok: false, error: "관리자 권한 필요" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { originalId, type, workMode, reason } = body;

    if (!originalId || !type || !workMode || !reason) {
      return Response.json(
        { ok: false, error: "originalId, type, workMode, reason 모두 필수" },
        { status: 400 },
      );
    }

    const original = await hrAttendanceRepository.findById(originalId);
    if (!original) {
      return Response.json(
        { ok: false, error: "원본 레코드를 찾을 수 없음" },
        { status: 404 },
      );
    }

    const registry = await hrEmployeeRegistryRepository.findByStaffId(
      original.staffId,
    );

    const corrected = await hrAttendanceRepository.correct(originalId, {
      staffId: original.staffId,
      staffName: original.staffName,
      type,
      workMode,
      isDeemedHours: registry?.workType === "deemed_hours",
      reason,
      actorId: hrActor?.staffId ?? "automation",
      actorName: hrActor?.staffName ?? "시스템",
    });

    return Response.json({ ok: true, corrected }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
