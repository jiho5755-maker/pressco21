import { text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { staff } from "./staff";

/**
 * hr_trips — 출장/외근 기록 (Phase 2)
 */
export const hrTrips = pgTable("hr_trips", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  staffName: text("staff_name").notNull(),
  tripType: text("trip_type").notNull(), // 'business_trip' | 'field_work'
  destination: text("destination").notNull(),
  purpose: text("purpose").notNull(),
  startDate: text("start_date").notNull(), // 'YYYY-MM-DD'
  endDate: text("end_date").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
