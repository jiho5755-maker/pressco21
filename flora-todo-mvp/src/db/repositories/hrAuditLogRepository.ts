import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { hrAuditLog } from "@/src/db/schema";

type CreateAuditInput = {
  targetTable: string;
  targetId: string;
  action: string;
  actorId: string;
  actorName: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  reason?: string;
};

export const hrAuditLogRepository = {
  async create(input: CreateAuditInput) {
    const [created] = await db
      .insert(hrAuditLog)
      .values({
        id: randomUUID(),
        targetTable: input.targetTable,
        targetId: input.targetId,
        action: input.action,
        actorId: input.actorId,
        actorName: input.actorName,
        beforeData: input.beforeData ?? null,
        afterData: input.afterData ?? null,
        reason: input.reason,
      })
      .returning();
    return created;
  },

  async listByTarget(targetTable: string, targetId: string) {
    return db
      .select()
      .from(hrAuditLog)
      .where(
        and(
          eq(hrAuditLog.targetTable, targetTable),
          eq(hrAuditLog.targetId, targetId),
        ),
      )
      .orderBy(desc(hrAuditLog.createdAt));
  },

  async listByTargetTable(targetTable: string, limit = 50) {
    return db
      .select()
      .from(hrAuditLog)
      .where(eq(hrAuditLog.targetTable, targetTable))
      .orderBy(desc(hrAuditLog.createdAt))
      .limit(limit);
  },
};
