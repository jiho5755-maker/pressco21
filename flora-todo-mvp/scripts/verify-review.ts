import "dotenv/config";
import { pool } from "../src/db/client";
import { getTaskSummary } from "../src/services/summaryService";
import { ingestTextAsTask } from "../src/services/ingestService";
import { GET as getReviewRoute } from "../app/api/admin/review/route";
import { PATCH as patchTaskRoute } from "../app/api/admin/tasks/[id]/route";

const sourceChannel = "verify-review";
const sourceMessageId = "review-001";
const sample = "안소영 연락 대기";

async function main() {
  await pool.query("delete from tasks where source_channel = $1", [sourceChannel]);

  const ingestResult = await ingestTextAsTask({
    sourceChannel,
    sourceMessageId,
    text: sample,
  });

  const createdTask = ingestResult.created.tasks[0];
  const beforeSummary = await getTaskSummary();

  const patchResponse = await patchTaskRoute(
    new Request("http://local/api/admin/tasks/" + createdTask.id, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: "resolved",
        priority: "p2",
        relatedProject: "안소영 후속",
      }),
    }),
    { params: Promise.resolve({ id: createdTask.id }) },
  );

  const queueResponse = await getReviewRoute(new Request("http://local/api/admin/review?limit=5"));
  const afterSummary = await getTaskSummary();

  console.log(
    JSON.stringify(
      {
        createdTaskId: createdTask.id,
        patchResult: await patchResponse.json(),
        reviewQueue: await queueResponse.json(),
        beforeSummary,
        afterSummary,
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
