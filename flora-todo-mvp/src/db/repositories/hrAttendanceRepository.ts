import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/src/db/client";
import { hrAttendance } from "@/src/db/schema";
import { hrAuditLogRepository } from "./hrAuditLogRepository";

type CreateAttendanceInput = {
  staffId: string;
  staffName: string;
  type: "clock_in" | "clock_out";
  workMode: "office" | "remote" | "field";
  isDeemedHours: boolean;
  clientTime?: string;
  source?: "telegram" | "miniapp";
  telegramMsgId?: string;
  locationDetail?: string;
  note?: string;
  actorId: string;
  actorName: string;
};

export const hrAttendanceRepository = {
  /**
   * Append-Only INSERT (UPDATE/DELETE 없음)
   */
  async create(input: CreateAttendanceInput) {
    const id = randomUUID();
    const [created] = await db
      .insert(hrAttendance)
      .values({
        id,
        staffId: input.staffId,
        staffName: input.staffName,
        type: input.type,
        workMode: input.workMode,
        isDeemedHours: input.isDeemedHours,
        clientTime: input.clientTime,
        source: input.source ?? "telegram",
        telegramMsgId: input.telegramMsgId,
        locationDetail: input.locationDetail,
        note: input.note,
      })
      .returning();

    // 감사 로그 기록
    await hrAuditLogRepository.create({
      targetTable: "hr_attendance",
      targetId: id,
      action: "create",
      actorId: input.actorId,
      actorName: input.actorName,
      afterData: created as unknown as Record<string, unknown>,
    });

    return created;
  },

  /**
   * 정정: 기존 레코드에 correctedBy를 남기고, 새 레코드를 INSERT
   */
  async correct(
    originalId: string,
    correctionInput: CreateAttendanceInput & { reason: string },
  ) {
    const newId = randomUUID();

    // 새 정정 레코드 INSERT
    const [corrected] = await db
      .insert(hrAttendance)
      .values({
        id: newId,
        staffId: correctionInput.staffId,
        staffName: correctionInput.staffName,
        type: correctionInput.type,
        workMode: correctionInput.workMode,
        isDeemedHours: correctionInput.isDeemedHours,
        clientTime: correctionInput.clientTime,
        source: "miniapp",
        note: `정정: ${correctionInput.reason}`,
        correctedBy: null,
      })
      .returning();

    // 원본 레코드에 정정 참조 표시 (유일한 UPDATE 케이스)
    await db
      .update(hrAttendance)
      .set({ correctedBy: newId })
      .where(eq(hrAttendance.id, originalId));

    // 감사 로그
    await hrAuditLogRepository.create({
      targetTable: "hr_attendance",
      targetId: originalId,
      action: "correct",
      actorId: correctionInput.actorId,
      actorName: correctionInput.actorName,
      beforeData: { originalId },
      afterData: corrected as unknown as Record<string, unknown>,
      reason: correctionInput.reason,
    });

    return corrected;
  },

  /**
   * 오늘의 출퇴근 상태 조회
   */
  async getTodayByStaffId(staffId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    return db
      .select()
      .from(hrAttendance)
      .where(
        and(
          eq(hrAttendance.staffId, staffId),
          gte(hrAttendance.recordedAt, todayStart),
          lt(hrAttendance.recordedAt, tomorrowStart),
        ),
      )
      .orderBy(hrAttendance.recordedAt);
  },

  /**
   * 월별 출퇴근 목록 (정정된 원본 제외)
   */
  async listByMonth(staffId: string, yearMonth: string) {
    const [year, month] = yearMonth.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    return db
      .select()
      .from(hrAttendance)
      .where(
        and(
          eq(hrAttendance.staffId, staffId),
          gte(hrAttendance.recordedAt, start),
          lt(hrAttendance.recordedAt, end),
          sql`${hrAttendance.correctedBy} IS NULL`,
        ),
      )
      .orderBy(desc(hrAttendance.recordedAt));
  },

  /**
   * 전직원 오늘 현황 (관리자용)
   */
  async getTodayAll() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    return db
      .select()
      .from(hrAttendance)
      .where(
        and(
          gte(hrAttendance.recordedAt, todayStart),
          lt(hrAttendance.recordedAt, tomorrowStart),
        ),
      )
      .orderBy(hrAttendance.recordedAt);
  },

  /**
   * 전직원 월별 출퇴근 목록 (관리자용, 정정된 원본 제외)
   */
  async listByMonthAll(yearMonth: string) {
    const [year, month] = yearMonth.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    return db
      .select()
      .from(hrAttendance)
      .where(
        and(
          gte(hrAttendance.recordedAt, start),
          lt(hrAttendance.recordedAt, end),
          sql`${hrAttendance.correctedBy} IS NULL`,
        ),
      )
      .orderBy(hrAttendance.staffId, desc(hrAttendance.recordedAt));
  },

  async findById(id: string) {
    const [found] = await db
      .select()
      .from(hrAttendance)
      .where(eq(hrAttendance.id, id))
      .limit(1);
    return found ?? null;
  },

  // 본인이 방금 실수로 누른 기록 취소 (10분 윈도우)
  // self-reference correctedBy로 무효 마킹하여 Append-Only 유지
  async cancel(
    originalId: string,
    actor: { actorId: string; actorName: string; reason: string },
  ) {
    const newId = randomUUID();
    const original = await hrAttendanceRepository.findById(originalId);
    if (!original) throw new Error("원본 기록이 없습니다");

    const [cancelled] = await db
      .insert(hrAttendance)
      .values({
        id: newId,
        staffId: original.staffId,
        staffName: original.staffName,
        type: original.type,
        workMode: original.workMode,
        isDeemedHours: original.isDeemedHours,
        source: original.source as "telegram" | "miniapp",
        note: `[CANCELLED] ${actor.reason}`,
        correctedBy: newId, // self-reference = 무효 마커
      })
      .returning();

    // 원본도 취소 레코드 참조하여 무효화
    await db
      .update(hrAttendance)
      .set({ correctedBy: newId })
      .where(eq(hrAttendance.id, originalId));

    await hrAuditLogRepository.create({
      targetTable: "hr_attendance",
      targetId: originalId,
      action: "cancel",
      actorId: actor.actorId,
      actorName: actor.actorName,
      beforeData: original as unknown as Record<string, unknown>,
      afterData: cancelled as unknown as Record<string, unknown>,
      reason: actor.reason,
    });

    return cancelled;
  },
};
