import { createHmac } from "node:crypto";
import { getEnv } from "@/src/lib/env";

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

export function verifyTelegramInitData(initData: string): TelegramUser | null {
  const botToken = getEnv().telegramBotToken;

  if (!botToken) {
    return parseTelegramInitDataUnsafe(initData);
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");

    if (!hash) {
      return null;
    }

    params.delete("hash");
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (computedHash !== hash) {
      return null;
    }

    const userStr = params.get("user");

    if (!userStr) {
      return null;
    }

    return JSON.parse(userStr) as TelegramUser;
  } catch {
    return null;
  }
}

function parseTelegramInitDataUnsafe(initData: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");

    if (!userStr) {
      return null;
    }

    return JSON.parse(userStr) as TelegramUser;
  } catch {
    return null;
  }
}

export function extractTelegramUser(request: Request): TelegramUser | null {
  const initData = request.headers.get("x-telegram-init-data");

  if (!initData) {
    return null;
  }

  return verifyTelegramInitData(initData);
}
