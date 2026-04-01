import "dotenv/config";
import { pool } from "../src/db/client";

async function main() {
  const result = await pool.query("select now() as now");
  console.log("db-connected", result.rows[0]?.now);
}

main()
  .catch((error) => {
    console.error("db-check-failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
