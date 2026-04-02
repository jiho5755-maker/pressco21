import { getReviewQueue } from "@/src/services/reviewService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const page = Number(searchParams.get("page") ?? "1");
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "all";
    const priority = searchParams.get("priority") ?? "all";
    const taskId = searchParams.get("taskId") ?? undefined;
    const queue = await getReviewQueue({
      limit,
      page,
      search,
      status,
      priority,
      taskId,
    });

    return Response.json({
      ok: true,
      count: queue.items.length,
      items: queue.items,
      page: queue.page,
      limit: queue.limit,
      totalCount: queue.totalCount,
      totalPages: queue.totalPages,
      hasPreviousPage: queue.hasPreviousPage,
      hasNextPage: queue.hasNextPage,
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
