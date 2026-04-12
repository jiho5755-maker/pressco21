import { NextRequest } from "next/server";
import { hrEmployeeRegistryRepository } from "@/src/db/repositories/hrEmployeeRegistryRepository";
import { staffRepository } from "@/src/db/repositories/staffRepository";
import { isHrAutomationAuthorized } from "@/src/lib/hr-auth";

/**
 * GET /api/hr/lookup?telegramUserId=12345
 *
 * n8n WF용: 텔레그램 사용자 → 직원 정보 조회
 * automation key 필수
 */
export async function GET(request: NextRequest) {
  if (!isHrAutomationAuthorized(request)) {
    return Response.json({ ok: false, error: "인증 실패" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const telegramUserId = searchParams.get("telegramUserId");

  if (!telegramUserId) {
    return Response.json(
      { ok: false, error: "telegramUserId 필수" },
      { status: 400 },
    );
  }

  const staffMember = await staffRepository.findByTelegramUserId(telegramUserId);
  if (!staffMember) {
    return Response.json(
      { ok: false, error: "등록되지 않은 사용자" },
      { status: 404 },
    );
  }

  const registry = await hrEmployeeRegistryRepository.findByStaffId(
    staffMember.id,
  );

  return Response.json({
    ok: true,
    staffId: staffMember.id,
    staffName: registry?.fullName ?? staffMember.name,
    telegramUserId: staffMember.telegramUserId,
    workType: registry?.workType ?? "standard",
    isDeemedHours: registry?.workType === "deemed_hours",
    hasConsent: Boolean(registry?.privacyConsentAt),
    department: registry?.department,
    jobTitle: registry?.jobTitle,
  });
}
