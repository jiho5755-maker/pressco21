type AppEnv = {
  databaseUrl: string;
  appTimezone: string;
  automationApiKey: string;
};

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const databaseUrl = process.env.DATABASE_URL;
  const automationApiKey = process.env.AUTOMATION_API_KEY ?? "dev-flora-automation-key";

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  cachedEnv = {
    databaseUrl,
    appTimezone: process.env.APP_TIMEZONE ?? "Asia/Seoul",
    automationApiKey,
  };

  return cachedEnv;
}
