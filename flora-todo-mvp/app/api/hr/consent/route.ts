import { NextRequest } from "next/server";
import { hrEmployeeRegistryRepository } from "@/src/db/repositories/hrEmployeeRegistryRepository";
import { staffRepository } from "@/src/db/repositories/staffRepository";
import { resolveHrActor, isHrAutomationAuthorized } from "@/src/lib/hr-auth";

/**
 * POST /api/hr/consent — 개인정보 수집·이용 동의
 *
 * 봇 WF: automation key + body.telegramUserId
 * 미니앱: telegram initData (자동 staffId)
 *
 * 근로기준법 제42조에 따른 3년 보관 동의
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 경로 1: 미니앱
    const hrActor = await resolveHrActor(request);
    if (hrActor) {
      const updated = await hrEmployeeRegistryRepository.setConsentByStaffId(
        hrActor.staffId,
        hrActor.staffId,
        hrActor.staffName,
      );
      if (!updated) {
        return Response.json(
          { ok: false, error: "근로자명부에 등록되지 않은 직원" },
          { status: 404 },
        );
      }
      return Response.json({
        ok: true,
        staffId: hrActor.staffId,
        consentedAt: updated.privacyConsentAt,
      });
    }

    // 경로 2: automation (n8n WF)
    if (isHrAutomationAuthorized(request)) {
      let staffId = body.staffId as string | undefined;
      let staffName = "system";

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

      const updated = await hrEmployeeRegistryRepository.setConsentByStaffId(
        staffId,
        staffId,
        staffName,
      );
      if (!updated) {
        return Response.json(
          { ok: false, error: "근로자명부에 등록되지 않은 직원" },
          { status: 404 },
        );
      }
      return Response.json({
        ok: true,
        staffId,
        staffName: updated.fullName,
        consentedAt: updated.privacyConsentAt,
      });
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
