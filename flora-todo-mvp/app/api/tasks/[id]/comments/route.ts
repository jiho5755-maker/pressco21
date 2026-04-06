import { extractTelegramUser } from "@/src/lib/telegram-auth";
import { isAutomationRequestAuthorized } from "@/src/lib/automation-auth";
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
  const { id: taskId } = await context.params;

  let authorName: string | null = null;

  // 인증 1순위: Telegram initData
  const tgUser = extractTelegramUser(request);
  if (tgUser) {
    const staffMember = await staffRepository.findByTelegramUserId(String(tgUser.id));
    if (!staffMember) {
      return Response.json({ ok: false, error: "Staff not found" }, { status: 403 });
    }
    authorName = staffMember.name;
  }

  // 인증 2순위: automation API key + body.authorName
  if (!authorName && isAutomationRequestAuthorized(request)) {
    const body = await request.clone().json().catch(() => ({}));
    authorName = (body.authorName ?? "").trim() || "시스템";
  }

  if (!authorName) {
    return Response.json({ ok: false, error: "Telegram initData or automation key required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const content = (body.content ?? "").trim();

    if (!content) {
      return Response.json({ ok: false, error: "content is required" }, { status: 400 });
    }

    const comment = await commentRepository.create({
      taskId,
      authorName,
      content,
    });

    return Response.json({ ok: true, comment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
