import { index, jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

/**
 * hr_audit_log — HR 감사 로그
 * DELETE API 미제공 (코드 레벨에서 원천 차단)
 * 모든 HR 변경에 before/after 스냅샷 보관
 */
export const hrAuditLog = pgTable(
  "hr_audit_log",
  {
    id: text("id").primaryKey(),
    targetTable: text("target_table").notNull(), // 'hr_attendance' 등
    targetId: text("target_id").notNull(),
    action: text("action").notNull(), // 'create' | 'update' | 'correct'
    actorId: text("actor_id").notNull(),
    actorName: text("actor_name").notNull(),
    beforeData: jsonb("before_data").$type<Record<string, unknown> | null>(),
    afterData: jsonb("after_data").$type<Record<string, unknown> | null>(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("hr_audit_log_target_idx").on(
      table.targetTable,
      table.targetId,
    ),
  ],
);
