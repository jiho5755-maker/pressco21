type AppEnv = {
  databaseUrl: string;
  appTimezone: string;
  automationApiKey: string;
  telegramBotToken: string;
  notifyWebhookUrl: string;
  minioEndpoint: string;
  minioAccessKey: string;
  minioSecretKey: string;
  minioBucket: string;
  minioPublicUrl: string;
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
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
    notifyWebhookUrl: process.env.NOTIFY_WEBHOOK_URL ?? "",
    minioEndpoint: process.env.MINIO_ENDPOINT ?? "https://img.pressco21.com",
    minioAccessKey: process.env.MINIO_ACCESS_KEY ?? "",
    minioSecretKey: process.env.MINIO_SECRET_KEY ?? "",
    minioBucket: process.env.MINIO_BUCKET ?? "images",
    minioPublicUrl: process.env.MINIO_PUBLIC_URL ?? "https://img.pressco21.com",
  };

  return cachedEnv;
}
