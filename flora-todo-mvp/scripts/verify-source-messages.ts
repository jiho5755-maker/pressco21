import "dotenv/config";
import { GET as getSourceMessagesRoute, POST as postSourceMessagesRoute } from "../app/api/automation/source-messages/route";
import { pool } from "../src/db/client";
import { sourceMessageRepository } from "../src/db/repositories/sourceMessageRepository";

const sourceChannel = "verify-source-messages";
const automationKey = process.env.AUTOMATION_API_KEY || "dev-flora-automation-key";

async function main() {
  await sourceMessageRepository.deleteBySourceChannel(sourceChannel);

  const headers = {
    authorization: "Bearer " + automationKey,
    "content-type": "application/json",
  };

  const firstResponse = await postSourceMessagesRoute(
    new Request("http://local/api/automation/source-messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        sourceChannel,
        sourceMessageId: "journal-001",
        userChatId: "7713811206",
        userName: "장지호",
        agentId: "flora",
        messageText: "레지너스 답변하고 로켓배송 등록 우선순위 다시 정리",
        responseSummary: "레지너스 우선으로 정리했습니다.",
        modelUsed: "gpt-5.4",
        skillTriggered: "secretary",
        tokensUsed: 321,
        responseTimeMs: 980,
        sourceCreatedAt: "2026-04-02T15:40:00+09:00",
        metadata: {
          transport: "telegram",
          room: "flora-secretary",
        },
      }),
    }),
  );

  const secondResponse = await postSourceMessagesRoute(
    new Request("http://local/api/automation/source-messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        sourceChannel,
        sourceMessageId: "journal-001",
        messageText: "레지너스 답변하고 로켓배송 등록 우선순위 다시 정리",
        responseSummary: "레지너스 → 중국 주문 체크 → 로켓배송으로 업데이트했습니다.",
        tokensUsed: 654,
        metadata: {
          normalized: true,
        },
      }),
    }),
  );

  const listResponse = await getSourceMessagesRoute(
    new Request("http://local/api/automation/source-messages?sourceChannel=verify-source-messages&search=레지너스&limit=5", {
      headers: {
        authorization: "Bearer " + automationKey,
      },
    }),
  );

  const firstPayload = await firstResponse.json();
  const secondPayload = await secondResponse.json();
  const listPayload = await listResponse.json();
  const dbRows = await pool.query<{
    source_message_id: string;
    response_summary: string | null;
    tokens_used: number;
    metadata: Record<string, unknown>;
  }>(
    `
      select source_message_id, response_summary, tokens_used, metadata
      from source_messages
      where source_channel = $1
      order by created_at desc
    `,
    [sourceChannel],
  );

  console.log(
    JSON.stringify(
      {
        firstPayload,
        secondPayload,
        listPayload,
        dbRows: dbRows.rows,
      },
      null,
      2,
    ),
  );

  if (
    !firstPayload.ok ||
    !secondPayload.ok ||
    !listPayload.ok ||
    listPayload.count !== 1 ||
    dbRows.rows.length !== 1 ||
    dbRows.rows[0]?.response_summary !== "레지너스 → 중국 주문 체크 → 로켓배송으로 업데이트했습니다." ||
    dbRows.rows[0]?.tokens_used !== 654 ||
    dbRows.rows[0]?.metadata?.transport !== "telegram" ||
    dbRows.rows[0]?.metadata?.normalized !== true
  ) {
    throw new Error("source message verification failed");
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
