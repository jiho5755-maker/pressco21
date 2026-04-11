import { index, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { staff } from "./staff";

/**
 * hr_work_logs — 업무일지
 * /퇴근 시 대화형 수집 또는 미니앱에서 작성
 * 장다경 영상 업무 특화: work_type으로 구분
 */
export const hrWorkLogs = pgTable(
  "hr_work_logs",
  {
    id: text("id").primaryKey(),
    staffId: text("staff_id")
      .notNull()
      .references(() => staff.id),
    staffName: text("staff_name").notNull(),
    workDate: text("work_date").notNull(), // 'YYYY-MM-DD'
    content: text("content").notNull(),
    workType: text("work_type"), // 'filming' | 'editing' | 'upload' | 'general'
    externalRef: text("external_ref"), // 유튜브 URL 등 (교차 검증용)
    source: text("source").notNull().default("miniapp"), // 'telegram' | 'miniapp'
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("hr_work_logs_staff_date_idx").on(
      table.staffId,
      table.workDate,
    ),
  ],
);
