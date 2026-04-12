import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/src/db/client";
import { hrWorkLogs } from "@/src/db/schema";
import { hrAuditLogRepository } from "@/src/db/repositories/hrAuditLogRepository";
import { staffRepository } from "@/src/db/repositories/staffRepository";
import { resolveHrActor, isHrAutomationAuthorized } from "@/src/lib/hr-auth";

/**
 * POST /api/hr/work-logs — 업무일지 작성
 * /퇴근 시 대화형 수집 (n8n) 또는 미니앱에서 직접 작성
 * telegramUserId로 직원 식별 가능 (n8n WF용)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const hrActor = await resolveHrActor(request);
    const isAutomation = isHrAutomationAuthorized(request);

    if (!hrActor && !isAutomation) {
      return Response.json({ ok: false, error: "인증 실패" }, { status: 401 });
    }

    const content = (body.content ?? "").trim();
    if (!content) {
      return Response.json(
        { ok: false, error: "content 필수" },
        { status: 400 },
      );
    }

    // 날짜: 미지정 시 오늘
    const workDate =
      body.workDate ??
      new Date().toLocaleDateString("sv-SE"); // 'YYYY-MM-DD' (sv locale trick)

    let staffId = hrActor?.staffId ?? body.staffId;
    let staffName = hrActor?.staffName ?? body.staffName ?? "unknown";

    // telegramUserId로 직원 식별 (automation + staffId 없을 때)
    if (!staffId && isAutomation && body.telegramUserId) {
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

    const id = randomUUID();
    const [created] = await db
      .insert(hrWorkLogs)
      .values({
        id,
        staffId,
        staffName,
        workDate,
        content,
        workType: body.workType ?? "general",
        externalRef: body.externalRef,
        source: hrActor ? "miniapp" : body.source ?? "telegram",
      })
      .returning();

    await hrAuditLogRepository.create({
      targetTable: "hr_work_logs",
      targetId: id,
      action: "create",
      actorId: staffId,
      actorName: staffName,
      afterData: created as unknown as Record<string, unknown>,
    });

    return Response.json({ ok: true, workLog: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * GET /api/hr/work-logs?staffId=xxx&month=2026-04
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

  const startDate = `${month}-01`;
  const [year, m] = month.split("-").map(Number);
  const endDate = `${year}-${String(m + 1).padStart(2, "0")}-00`;
  // month의 마지막 날 계산
  const lastDay = new Date(year, m, 0).getDate();
  const endDateStr = `${month}-${String(lastDay).padStart(2, "0")}`;

  const logs = await db
    .select()
    .from(hrWorkLogs)
    .where(
      and(
        eq(hrWorkLogs.staffId, staffId),
        gte(hrWorkLogs.workDate, startDate),
        lte(hrWorkLogs.workDate, endDateStr),
      ),
    )
    .orderBy(desc(hrWorkLogs.workDate));

  return Response.json({ ok: true, logs });
}
