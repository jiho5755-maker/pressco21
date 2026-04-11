import { index, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { staff } from "./staff";

/**
 * hr_leave_records — 휴가/연차 기록
 * 연차 자동계산 + 촉진 자동화 (Phase 2~4)
 */
export const hrLeaveRecords = pgTable(
  "hr_leave_records",
  {
    id: text("id").primaryKey(),
    staffId: text("staff_id")
      .notNull()
      .references(() => staff.id),
    staffName: text("staff_name").notNull(),
    leaveType: text("leave_type").notNull(), // 'annual' | 'half_am' | 'half_pm' | 'sick' | 'special'
    startDate: text("start_date").notNull(), // 'YYYY-MM-DD'
    endDate: text("end_date").notNull(),
    days: text("days").notNull(), // '1.0', '0.5' 등
    reason: text("reason"),
    status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("hr_leave_records_staff_date_idx").on(
      table.staffId,
      table.startDate,
    ),
  ],
);
