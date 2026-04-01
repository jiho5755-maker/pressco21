import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/src/db/schema";
import { getEnv } from "@/src/lib/env";

declare global {
  // 개발 모드에서 연결 풀 중복 생성을 막습니다.
  // eslint-disable-next-line no-var
  var __floraTodoPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    connectionString: getEnv().databaseUrl,
    max: 10,
  });
}

const pool = globalThis.__floraTodoPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.__floraTodoPool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
