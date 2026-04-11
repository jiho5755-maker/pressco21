import { extractTelegramUser } from "@/src/lib/telegram-auth";
import { staffRepository } from "@/src/db/repositories/staffRepository";
import { hrEmployeeRegistryRepository } from "@/src/db/repositories/hrEmployeeRegistryRepository";
import { getEnv } from "@/src/lib/env";

// 관리자 권한이 있는 직원명 (대표 + CTO)
const ADMIN_NAMES = ["이진선", "장지호"];

export type HrActor = {
  staffId: string;
  staffName: string;
  isAdmin: boolean;
  isDeemedHours: boolean;
};

/**
 * HR API 인증: Telegram initData 또는 automation key로 직원 식별
 * 반환: HrActor 또는 null (인증 실패)
 */
export async function resolveHrActor(
  request: Request,
): Promise<HrActor | null> {
  // 1) Telegram initData로 직원 식별
  const tgUser = extractTelegramUser(request);
  if (tgUser) {
    const tgUserId = String(tgUser.id);
    const staffMember = await staffRepository.findByTelegramUserId(tgUserId);
    if (staffMember) {
      const registry =
        await hrEmployeeRegistryRepository.findByStaffId(staffMember.id);
      return {
        staffId: staffMember.id,
        staffName: staffMember.name,
        isAdmin: ADMIN_NAMES.includes(staffMember.name),
        isDeemedHours: registry?.workType === "deemed_hours",
      };
    }
  }

  // 2) Automation API key 폴백 (n8n WF, 브라우저 테스트)
  const apiKey = request.headers.get("x-flora-automation-key");
  const env = getEnv();
  if (apiKey && apiKey === env.automationApiKey) {
    // staffId가 body 또는 query에 포함되어야 함
    return null; // automation 호출은 별도 처리
  }

  return null;
}

/**
 * Automation 인증 확인 (n8n WF용)
 */
export function isHrAutomationAuthorized(request: Request): boolean {
  const apiKey =
    request.headers.get("x-flora-automation-key") ??
    request.headers.get("authorization")?.replace("Bearer ", "");
  const env = getEnv();
  return Boolean(apiKey) && apiKey === env.automationApiKey;
}
