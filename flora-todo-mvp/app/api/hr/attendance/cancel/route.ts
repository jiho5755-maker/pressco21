import { NextRequest } from "next/server";
import { hrAttendanceRepository } from "@/src/db/repositories/hrAttendanceRepository";
import { staffRepository } from "@/src/db/repositories/staffRepository";
import { resolveHrActor, isHrAutomationAuthorized } from "@/src/lib/hr-auth";

const CANCEL_WINDOW_MS = 10 * 60 * 1000; // 10분

/**
 * POST /api/hr/attendance/cancel — 본인이 방금 누른 출퇴근 기록 취소
 *
 * 조건:
 *   - 10분 이내에 본인이 누른 기록만 취소 가능
 *   - 이미 정정/취소된 기록은 재취소 불가
 *   - 10분 경과 시 관리자 정정 필요 (관리자는 /correct 사용)
 *
 * Body: { recordId, telegramUserId? | staffId? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const recordId = body.recordId as string;
    if (!recordId) {
      return Response.json(
        { ok: false, error: "recordId 필수" },
        { status: 400 },
      );
    }

    // 레코드 조회
    const original = await hrAttendanceRepository.findById(recordId);
    if (!original) {
      return Response.json(
        { ok: false, error: "not_found", message: "해당 기록을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 이미 취소/정정된 경우
    if (original.correctedBy) {
      return Response.json(
        {
          ok: false,
          error: "already_cancelled",
          message: "이미 취소되었거나 정정된 기록입니다",
        },
        { status: 409 },
      );
    }

    // 10분 윈도우 검증
    const elapsed = Date.now() - new Date(original.createdAt).getTime();
    if (elapsed > CANCEL_WINDOW_MS) {
      const minutes = Math.floor(elapsed / 60000);
      return Response.json(
        {
          ok: false,
          error: "window_expired",
          message: `취소 가능 시간(10분)이 지났습니다 (${minutes}분 경과). 관리자(장지호)에게 정정을 요청해주세요.`,
          elapsedMinutes: minutes,
        },
        { status: 408 },
      );
    }

    // 본인 확인
    let actorStaffId: string | undefined;
    let actorStaffName: string | undefined;

    const hrActor = await resolveHrActor(request);
    if (hrActor) {
      actorStaffId = hrActor.staffId;
      actorStaffName = hrActor.staffName;
    } else if (isHrAutomationAuthorized(request)) {
      if (body.staffId) {
        actorStaffId = body.staffId;
        actorStaffName = body.staffName ?? "unknown";
      } else if (body.telegramUserId) {
        const staffMember = await staffRepository.findByTelegramUserId(
          String(body.telegramUserId),
        );
        if (!staffMember) {
          return Response.json(
            { ok: false, error: "등록되지 않은 직원입니다" },
            { status: 404 },
          );
        }
        actorStaffId = staffMember.id;
        actorStaffName = staffMember.name;
      } else {
        return Response.json(
          { ok: false, error: "staffId 또는 telegramUserId 필수" },
          { status: 400 },
        );
      }
    } else {
      return Response.json(
        { ok: false, error: "인증 실패" },
        { status: 401 },
      );
    }

    // 권한: 본인 기록만 취소 가능
    if (original.staffId !== actorStaffId) {
      return Response.json(
        {
          ok: false,
          error: "forbidden",
          message: "본인의 기록만 취소할 수 있습니다",
        },
        { status: 403 },
      );
    }

    const reason = body.reason || "본인 요청 (10분 내 취소)";
    const cancelled = await hrAttendanceRepository.cancel(recordId, {
      actorId: actorStaffId!,
      actorName: actorStaffName!,
      reason,
    });

    return Response.json(
      {
        ok: true,
        message: `${original.type === "clock_in" ? "출근" : "퇴근"} 기록이 취소되었습니다`,
        cancelledRecord: cancelled,
        originalType: original.type,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
