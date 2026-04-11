import { boolean, index, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { staff } from "./staff";

/**
 * hr_attendance — 출퇴근/업무보고 기록
 * Append-Only: INSERT만 허용, UPDATE/DELETE API 없음 (법적 증거력)
 * 간주근로 대상은 "업무 시작/종료 보고" 라벨 사용 (근기법 58조)
 */
export const hrAttendance = pgTable(
  "hr_attendance",
  {
    id: text("id").primaryKey(),
    staffId: text("staff_id")
      .notNull()
      .references(() => staff.id),
    staffName: text("staff_name").notNull(),
    type: text("type").notNull(), // 'clock_in' | 'clock_out'
    workMode: text("work_mode").notNull(), // 'office' | 'remote' | 'field'
    isDeemedHours: boolean("is_deemed_hours").notNull().default(false),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    clientTime: text("client_time"),
    source: text("source").notNull().default("telegram"), // 'telegram' | 'miniapp'
    telegramMsgId: text("telegram_msg_id"),
    locationDetail: text("location_detail"),
    note: text("note"),
    correctedBy: text("corrected_by"), // 정정 시 새 레코드 ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("hr_attendance_staff_recorded_idx").on(
      table.staffId,
      table.recordedAt,
    ),
    index("hr_attendance_type_recorded_idx").on(
      table.type,
      table.recordedAt,
    ),
  ],
);
