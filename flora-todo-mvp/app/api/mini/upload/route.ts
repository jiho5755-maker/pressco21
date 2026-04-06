import { extractTelegramUser } from "@/src/lib/telegram-auth";
import { getEnv } from "@/src/lib/env";
import { uploadFile, MAX_FILE_SIZE, isAllowedType } from "@/src/lib/minio";

export async function POST(request: Request) {
  // 인증: Telegram initData 우선, API 키 폴백
  const tgUser = extractTelegramUser(request);

  if (!tgUser) {
    const apiKey = request.headers.get("x-flora-automation-key");
    const env = getEnv();
    if (!apiKey || apiKey !== env.automationApiKey) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const taskId = formData.get("taskId");

    if (!file || !(file instanceof File)) {
      return Response.json({ ok: false, error: "file is required" }, { status: 400 });
    }

    if (!taskId || typeof taskId !== "string") {
      return Response.json({ ok: false, error: "taskId is required" }, { status: 400 });
    }

    if (!isAllowedType(file.type)) {
      return Response.json(
        { ok: false, error: `Unsupported file type: ${file.type}. Allowed: images, videos, PDF` },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { ok: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 50MB)` },
        { status: 400 },
      );
    }

    const result = await uploadFile(file, taskId);

    return Response.json({
      ok: true,
      file: {
        url: result.url,
        name: result.originalName,
        size: result.size,
        type: result.contentType,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("[upload] error:", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
