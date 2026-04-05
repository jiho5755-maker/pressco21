import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { comments } from "@/src/db/schema";

export const commentRepository = {
  async listByTaskId(taskId: string) {
    return db
      .select()
      .from(comments)
      .where(eq(comments.taskId, taskId))
      .orderBy(asc(comments.createdAt));
  },

  async create(input: { taskId: string; authorName: string; content: string }) {
    const [created] = await db
      .insert(comments)
      .values({
        id: randomUUID(),
        taskId: input.taskId,
        authorName: input.authorName,
        content: input.content,
      })
      .returning();
    return created;
  },

  async deleteById(commentId: string, authorName: string) {
    const [deleted] = await db
      .delete(comments)
      .where(eq(comments.id, commentId))
      .returning();
    if (deleted && deleted.authorName !== authorName) {
      return null;
    }
    return deleted ?? null;
  },
};
