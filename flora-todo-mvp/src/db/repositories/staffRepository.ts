import { eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { staff } from "@/src/db/schema";

export const staffRepository = {
  async listAll() {
    return db.select().from(staff).orderBy(staff.name);
  },

  async findByTelegramUserId(telegramUserId: string) {
    const [found] = await db
      .select()
      .from(staff)
      .where(eq(staff.telegramUserId, telegramUserId))
      .limit(1);
    return found ?? null;
  },

  async findByName(name: string) {
    const [found] = await db.select().from(staff).where(eq(staff.name, name)).limit(1);
    return found ?? null;
  },

  async updateTelegramUserId(staffId: string, telegramUserId: string) {
    const [updated] = await db
      .update(staff)
      .set({ telegramUserId, updatedAt: new Date() })
      .where(eq(staff.id, staffId))
      .returning();
    return updated ?? null;
  },
};
