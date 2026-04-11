import { integer, jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { staff } from "./staff";

/**
 * hr_payslip — 임금명세서 (법정 서류, Phase 4)
 * 근기법 제48조② + 시행령 제27조의2 법정 기재사항
 */
export const hrPayslip = pgTable("hr_payslip", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  staffName: text("staff_name").notNull(),
  payPeriod: text("pay_period").notNull(), // '2026-04'
  payDate: text("pay_date").notNull(), // 'YYYY-MM-DD'
  baseSalary: integer("base_salary"),
  mealAllowance: integer("meal_allowance"),
  overtimePay: integer("overtime_pay"),
  bonus: integer("bonus"),
  grossTotal: integer("gross_total").notNull(),
  deductions: jsonb("deductions").$type<Record<string, number>>(),
  deductionsTotal: integer("deductions_total").notNull(),
  netPay: integer("net_pay").notNull(),
  calculationNote: text("calculation_note"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  deliveryMethod: text("delivery_method"), // 'telegram' | 'email'
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
