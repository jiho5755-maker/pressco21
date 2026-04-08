import { buildAutomationUnauthorizedResponse, isAutomationRequestAuthorized } from "@/src/lib/automation-auth";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

const QUEUE_ROOT = process.env.DEV_WORKER_QUEUE_PATH || "/dev-worker-queue";
const VALID_WORKERS = ["claude", "codex"];

export async function POST(request: Request) {
  if (!isAutomationRequestAuthorized(request)) {
    return buildAutomationUnauthorizedResponse();
  }

  try {
    const body = await request.json();
    const worker = String(body.worker || "claude").toLowerCase();
    const prompt = String(body.prompt || "").trim();

    if (!prompt) {
      return Response.json({ ok: false, error: "prompt is required" }, { status: 400 });
    }

    if (!VALID_WORKERS.includes(worker)) {
      return Response.json({ ok: false, error: `Invalid worker: ${worker}. Use: ${VALID_WORKERS.join(", ")}` }, { status: 400 });
    }

    const id = body.id || randomUUID();
    const task = {
      id,
      prompt,
      chatId: String(body.chatId || "-5043778307"),
      worker,
      replyToMessageId: body.replyToMessageId || null,
      createdAt: new Date().toISOString(),
    };

    const pendingDir = join(QUEUE_ROOT, worker, "pending");
    if (!existsSync(pendingDir)) {
      await mkdir(pendingDir, { recursive: true });
    }

    const filePath = join(pendingDir, `task-${id}.json`);
    await writeFile(filePath, JSON.stringify(task, null, 2));

    return Response.json({ ok: true, id, worker }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
