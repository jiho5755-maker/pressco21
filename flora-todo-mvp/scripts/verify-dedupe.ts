import "dotenv/config";
import { pool } from "../src/db/client";
import { ingestTextAsTask } from "../src/services/ingestService";

const sourceChannel = "verify-dedupe";
const sourceMessageId = "dup-001";
const sample = "다음주 월요일 안소영 연락 대기";

async function fetchSnapshot() {
  const tasksResult = await pool.query<{
    id: string;
    segment_hash: string;
  }>(
    `
      select id, segment_hash
      from tasks
      where source_channel = $1 and source_message_id = $2 and ignored_at is null
      order by created_at, id
    `,
    [sourceChannel, sourceMessageId],
  );

  const remindersResult = await pool.query<{ id: string }>(
    `
      select r.id
      from reminders r
      join tasks t on t.id = r.task_id
      where t.source_channel = $1 and t.source_message_id = $2 and t.ignored_at is null
      order by r.created_at, r.id
    `,
    [sourceChannel, sourceMessageId],
  );

  const followupsResult = await pool.query<{ id: string }>(
    `
      select f.id
      from followups f
      join tasks t on t.id = f.task_id
      where t.source_channel = $1 and t.source_message_id = $2 and t.ignored_at is null
      order by f.created_at, f.id
    `,
    [sourceChannel, sourceMessageId],
  );

  return {
    tasks: tasksResult.rows.map((row) => row.id),
    segmentHashes: tasksResult.rows.map((row) => row.segment_hash),
    reminders: remindersResult.rows.map((row) => row.id),
    followups: followupsResult.rows.map((row) => row.id),
  };
}

async function main() {
  await pool.query("delete from tasks where source_channel = $1", [sourceChannel]);

  const first = await ingestTextAsTask({
    sourceChannel,
    sourceMessageId,
    text: sample,
  });
  const firstSnapshot = await fetchSnapshot();

  const second = await ingestTextAsTask({
    sourceChannel,
    sourceMessageId,
    text: sample,
  });
  const secondSnapshot = await fetchSnapshot();

  const result = {
    sample,
    first: first.dedupe,
    second: second.dedupe,
    snapshots: {
      first: firstSnapshot,
      second: secondSnapshot,
    },
    stableIds: {
      tasks: JSON.stringify(firstSnapshot.tasks) === JSON.stringify(secondSnapshot.tasks),
      reminders: JSON.stringify(firstSnapshot.reminders) === JSON.stringify(secondSnapshot.reminders),
      followups: JSON.stringify(firstSnapshot.followups) === JSON.stringify(secondSnapshot.followups),
    },
    rowCountsUnchanged:
      firstSnapshot.tasks.length === secondSnapshot.tasks.length &&
      firstSnapshot.reminders.length === secondSnapshot.reminders.length &&
      firstSnapshot.followups.length === secondSnapshot.followups.length,
  };

  console.log(JSON.stringify(result, null, 2));

  if (
    !result.rowCountsUnchanged ||
    !result.stableIds.tasks ||
    !result.stableIds.reminders ||
    !result.stableIds.followups
  ) {
    throw new Error("dedupe verification failed");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
