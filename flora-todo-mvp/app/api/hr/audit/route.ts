import { NextRequest } from "next/server";
import { hrAuditLogRepository } from "@/src/db/repositories/hrAuditLogRepository";
import { resolveHrActor, isHrAutomationAuthorized } from "@/src/lib/hr-auth";

/**
 * GET /api/hr/audit?targetTable=hr_attendance&targetId=xxx
 * 감사 로그 조회 (관리자 전용)
 * DELETE 엔드포인트 없음 — 코드 레벨에서 원천 차단
 */
export async function GET(request: NextRequest) {
  const hrActor = await resolveHrActor(request);
  const isAutomation = isHrAutomationAuthorized(request);

  if (!hrActor?.isAdmin && !isAutomation) {
    return Response.json(
      { ok: false, error: "관리자 권한 필요" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const targetTable = searchParams.get("targetTable");
  const targetId = searchParams.get("targetId");

  if (targetTable && targetId) {
    const logs = await hrAuditLogRepository.listByTarget(targetTable, targetId);
    return Response.json({ ok: true, logs });
  }

  if (targetTable) {
    const limit = Number(searchParams.get("limit") ?? "50");
    const logs = await hrAuditLogRepository.listByTargetTable(
      targetTable,
      limit,
    );
    return Response.json({ ok: true, logs });
  }

  return Response.json(
    { ok: false, error: "targetTable 파라미터 필수" },
    { status: 400 },
  );
}
