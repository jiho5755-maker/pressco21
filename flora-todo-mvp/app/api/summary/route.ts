import { getTaskSummary } from "@/src/services/summaryService";

export async function GET() {
  try {
    const summary = await getTaskSummary();

    return Response.json({
      ok: true,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return Response.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
