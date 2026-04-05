import { extractTelegramUser } from "@/src/lib/telegram-auth";
import { staffRepository } from "@/src/db/repositories/staffRepository";

export async function GET(request: Request) {
  const tgUser = extractTelegramUser(request);

  if (!tgUser) {
    return Response.json({ ok: false, error: "Telegram initData required" }, { status: 401 });
  }

  const tgUserId = String(tgUser.id);
  let staffMember = await staffRepository.findByTelegramUserId(tgUserId);

  if (!staffMember) {
    // 이름으로 매칭 시도 (first_name 기반)
    const displayName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ");
    staffMember = await staffRepository.findByName(displayName);

    if (staffMember && !staffMember.telegramUserId) {
      // 자동 연결
      staffMember = await staffRepository.updateTelegramUserId(staffMember.id, tgUserId);
    }
  }

  if (!staffMember) {
    return Response.json({
      ok: true,
      staff: null,
      telegramUser: { id: tgUser.id, firstName: tgUser.first_name },
    });
  }

  return Response.json({
    ok: true,
    staff: {
      id: staffMember.id,
      name: staffMember.name,
      role: staffMember.role,
      telegramUserId: staffMember.telegramUserId,
    },
    telegramUser: { id: tgUser.id, firstName: tgUser.first_name },
  });
}
