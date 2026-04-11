import { real, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { staff } from "./staff";

/**
 * hr_training_records — 교육훈련 기록 (Phase 2)
 * 안전보건교육 등 법정 교육 이수 관리
 */
export const hrTrainingRecords = pgTable("hr_training_records", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  staffName: text("staff_name").notNull(),
  trainingType: text("training_type").notNull(), // 'safety' | 'job_skill' | 'harassment' | 'external'
  title: text("title").notNull(),
  provider: text("provider"),
  startDate: text("start_date").notNull(), // 'YYYY-MM-DD'
  endDate: text("end_date").notNull(),
  hours: real("hours").notNull(),
  certificateUrl: text("certificate_url"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
