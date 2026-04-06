import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
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
const IMAGE_MAX_WIDTH = 1920;
const IMAGE_QUALITY = 80;
// 500KB 이상이면 압축
const COMPRESS_THRESHOLD = 500 * 1024;

const COMPRESSIBLE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
  originalName: string;
  compressed?: boolean;
  originalSize?: number;
}

async function compressImage(
  buffer: Buffer,
  mimeType: string,
): Promise<{ data: Buffer; contentType: string }> {
  let pipeline = sharp(buffer);

  // 메타데이터로 크기 확인
  const meta = await pipeline.metadata();
  const needsResize = meta.width && meta.width > IMAGE_MAX_WIDTH;

  if (needsResize) {
    pipeline = pipeline.resize(IMAGE_MAX_WIDTH, undefined, {
      withoutEnlargement: true,
      fit: "inside",
    });
  }

  // WebP로 변환하여 최대 압축률 달성
  const result = await pipeline.webp({ quality: IMAGE_QUALITY }).toBuffer();
  return { data: Buffer.from(result), contentType: "image/webp" };
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

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  let body: Uint8Array = rawBuffer;
  let contentType = file.type;
  let compressed = false;
  const originalSize = rawBuffer.length;
  let finalExt = ext;

  // 이미지 자동 압축 (500KB 이상 & 압축 가능 타입)
  if (COMPRESSIBLE_TYPES.has(file.type) && rawBuffer.length > COMPRESS_THRESHOLD) {
    try {
      const result = await compressImage(rawBuffer, file.type);
      compressed = true;
      body = result.data;
      contentType = result.contentType;
      if (result.contentType === "image/webp") finalExt = ".webp";
      console.log(
        `[upload] compressed ${file.name}: ${(originalSize / 1024).toFixed(0)}KB → ${(body.length / 1024).toFixed(0)}KB (${((1 - body.length / originalSize) * 100).toFixed(0)}% saved)`,
      );
    } catch (err) {
      // 압축 실패 시 원본 사용
      console.warn("[upload] compression failed, using original:", err);
    }
  }

  const key = `tasks/${taskId}/${timestamp}-${safeName.replace(/\.[^.]+$/, "")}${finalExt}`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.minioBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.length,
    }),
  );

  return {
    url: `${env.minioPublicUrl}/${env.minioBucket}/${key}`,
    key,
    size: body.length,
    contentType,
    originalName: file.name,
    compressed,
    originalSize: compressed ? originalSize : undefined,
  };
}

export function isAllowedType(mimeType: string): boolean {
  return mimeType in ALLOWED_TYPES;
}

export { MAX_FILE_SIZE, ALLOWED_TYPES };
