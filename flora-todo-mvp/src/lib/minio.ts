import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getEnv } from "./env";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const env = getEnv();
  const endpoint = env.minioEndpoint;

  s3Client = new S3Client({
    endpoint,
    region: "us-east-1",
    credentials: {
      accessKeyId: env.minioAccessKey,
      secretAccessKey: env.minioSecretKey,
    },
    forcePathStyle: true,
  });

  return s3Client;
}

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "application/pdf": ".pdf",
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
  originalName: string;
}

export async function uploadFile(
  file: File,
  taskId: string,
): Promise<UploadResult> {
  const env = getEnv();

  if (!env.minioAccessKey) {
    throw new Error("MinIO credentials not configured");
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 50MB)`);
  }

  const timestamp = Date.now();
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .substring(0, 100);
  const key = `tasks/${taskId}/${timestamp}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.minioBucket,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ContentLength: file.size,
    }),
  );

  return {
    url: `${env.minioPublicUrl}/${env.minioBucket}/${key}`,
    key,
    size: file.size,
    contentType: file.type,
    originalName: file.name,
  };
}

export function isAllowedType(mimeType: string): boolean {
  return mimeType in ALLOWED_TYPES;
}

export { MAX_FILE_SIZE, ALLOWED_TYPES };
