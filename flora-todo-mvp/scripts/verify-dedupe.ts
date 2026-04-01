import "dotenv/config";
import { pool } from "../src/db/client";
import { ingestTextAsTask } from "../src/services/ingestService";

const sourceChannel = "verify-dedupe";
const sourceMessageId = "dup-001";
const sample = "안소영 연락 대기, 다음주 월요일 불량품 수거";

async function main() {
  await pool.query("delete from tasks where source_channel = $1", [sourceChannel]);

  const first = await ingestTextAsTask({
    sourceChannel,
    sourceMessageId,
    text: sample,
  });

  const second = await ingestTextAsTask({
    sourceChannel,
    sourceMessageId,
    text: sample,
  });

  const taskCount = await pool.query<{ value: string }>(
    "select cast(count(*) as text) as value from tasks where source_channel = $1 and source_message_id = $2 and ignored_at is null",
    [sourceChannel, sourceMessageId],
  );
  const reminderCount = await pool.query<{ value: string }>(
    `
      select cast(count(*) as text) as value
      from reminders
      where task_id in (
        select id from tasks where source_channel = $1 and source_message_id = $2 and ignored_at is null
      )
    `,
    [sourceChannel, sourceMessageId],
  );
  const followupCount = await pool.query<{ value: string }>(
    `
      select cast(count(*) as text) as value
      from followups
      where task_id in (
        select id from tasks where source_channel = $1 and source_message_id = $2 and ignored_at is null
      )
    `,
    [sourceChannel, sourceMessageId],
  );

  console.log(
    JSON.stringify(
      {
        sample,
        first: first.dedupe,
        second: second.dedupe,
        counts: {
          tasks: taskCount.rows[0]?.value,
          reminders: reminderCount.rows[0]?.value,
          followups: followupCount.rows[0]?.value,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
