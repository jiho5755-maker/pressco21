import { extractTelegramUser } from "@/src/lib/telegram-auth";
import { staffRepository } from "@/src/db/repositories/staffRepository";
import { commentRepository } from "@/src/db/repositories/commentRepository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: taskId } = await context.params;
  const commentsList = await commentRepository.listByTaskId(taskId);

  return Response.json({ ok: true, comments: commentsList });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const tgUser = extractTelegramUser(request);

  if (!tgUser) {
    return Response.json({ ok: false, error: "Telegram initData required" }, { status: 401 });
  }

  const staffMember = await staffRepository.findByTelegramUserId(String(tgUser.id));

  if (!staffMember) {
    return Response.json({ ok: false, error: "Staff not found" }, { status: 403 });
  }

  const { id: taskId } = await context.params;

  try {
    const body = await request.json();
    const content = (body.content ?? "").trim();

    if (!content) {
      return Response.json({ ok: false, error: "content is required" }, { status: 400 });
    }

    const comment = await commentRepository.create({
      taskId,
      authorName: staffMember.name,
      content,
    });

    return Response.json({ ok: true, comment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
