import { jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { staff } from "./staff";

/**
 * hr_employee_registry — 근로자 명부 (법정 서류)
 * 근기법 제41조 + 시행령 제20조 법정 기재사항
 * 3년 보관 의무 (근기법 제42조)
 */
export const hrEmployeeRegistry = pgTable("hr_employee_registry", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  fullName: text("full_name").notNull(),
  gender: text("gender"), // 'male' | 'female'
  birthDate: text("birth_date"), // 'YYYY-MM-DD'
  address: text("address"),
  careerHistory: jsonb("career_history").$type<Record<string, unknown>[] | null>(),
  jobTitle: text("job_title"), // 직위: 팀장, 과장, 대리 등
  department: text("department"), // 부서
  jobDescription: text("job_description"), // 종사 업무
  hireDate: text("hire_date").notNull(), // 'YYYY-MM-DD'
  contractType: text("contract_type"), // 'permanent' | 'fixed' | 'part_time' | 'contract'
  workType: text("work_type"), // 'standard' | 'deemed_hours' | 'inclusive_wage'
  separationDate: text("separation_date"), // 퇴직일
  separationReason: text("separation_reason"),
  status: text("status").notNull().default("active"), // 'active' | 'separated'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  privacyConsentAt: timestamp("privacy_consent_at", { withTimezone: true }),
});
