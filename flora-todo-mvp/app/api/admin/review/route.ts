import { getReviewQueue } from "@/src/services/reviewService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const queue = await getReviewQueue(limit);

    return Response.json({
      ok: true,
      count: queue.length,
      items: queue,
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
