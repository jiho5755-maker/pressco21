import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { hrEmployeeRegistry } from "@/src/db/schema";
import { hrAuditLogRepository } from "./hrAuditLogRepository";

type CreateRegistryInput = {
  staffId: string;
  fullName: string;
  gender?: string;
  birthDate?: string;
  address?: string;
  careerHistory?: Record<string, unknown>[] | null;
  jobTitle?: string;
  department?: string;
  jobDescription?: string;
  hireDate: string;
  contractType?: string;
  workType?: string;
  status?: string;
};

type UpdateRegistryInput = Partial<Omit<CreateRegistryInput, "staffId">> & {
  actorId: string;
  actorName: string;
  reason?: string;
};

export const hrEmployeeRegistryRepository = {
  async create(input: CreateRegistryInput, actorId: string, actorName: string) {
    const id = randomUUID();
    const [created] = await db
      .insert(hrEmployeeRegistry)
      .values({
        id,
        staffId: input.staffId,
        fullName: input.fullName,
        gender: input.gender,
        birthDate: input.birthDate,
        address: input.address,
        careerHistory: input.careerHistory,
        jobTitle: input.jobTitle,
        department: input.department,
        jobDescription: input.jobDescription,
        hireDate: input.hireDate,
        contractType: input.contractType ?? "permanent",
        workType: input.workType ?? "standard",
        status: input.status ?? "active",
      })
      .returning();

    await hrAuditLogRepository.create({
      targetTable: "hr_employee_registry",
      targetId: id,
      action: "create",
      actorId,
      actorName,
      afterData: created as unknown as Record<string, unknown>,
    });

    return created;
  },

  async update(registryId: string, input: UpdateRegistryInput) {
    const existing = await this.findById(registryId);
    if (!existing) return null;

    const { actorId, actorName, reason, ...updateFields } = input;
    const [updated] = await db
      .update(hrEmployeeRegistry)
      .set({ ...updateFields, updatedAt: new Date() })
      .where(eq(hrEmployeeRegistry.id, registryId))
      .returning();

    await hrAuditLogRepository.create({
      targetTable: "hr_employee_registry",
      targetId: registryId,
      action: "update",
      actorId,
      actorName,
      beforeData: existing as unknown as Record<string, unknown>,
      afterData: updated as unknown as Record<string, unknown>,
      reason,
    });

    return updated;
  },

  async listAll() {
    return db
      .select()
      .from(hrEmployeeRegistry)
      .orderBy(hrEmployeeRegistry.fullName);
  },

  async listActive() {
    return db
      .select()
      .from(hrEmployeeRegistry)
      .where(eq(hrEmployeeRegistry.status, "active"))
      .orderBy(hrEmployeeRegistry.fullName);
  },

  async findById(id: string) {
    const [found] = await db
      .select()
      .from(hrEmployeeRegistry)
      .where(eq(hrEmployeeRegistry.id, id))
      .limit(1);
    return found ?? null;
  },

  async findByStaffId(staffId: string) {
    const [found] = await db
      .select()
      .from(hrEmployeeRegistry)
      .where(eq(hrEmployeeRegistry.staffId, staffId))
      .limit(1);
    return found ?? null;
  },
};
