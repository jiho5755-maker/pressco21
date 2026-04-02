import { getDashboardData } from "@/src/services/dashboardService";
import { DashboardDateRange, DashboardFilters } from "@/src/types/dashboard";

function parseDateRange(value: string | null): DashboardDateRange {
  if (value === "today" || value === "thisWeek" || value === "next7Days") {
    return value;
  }

  return "thisWeek";
}

function parseStatus(value: string | null): DashboardFilters["status"] {
  if (
    value === "all" ||
    value === "active" ||
    value === "todo" ||
    value === "waiting" ||
    value === "needs_check" ||
    value === "in_progress" ||
    value === "done" ||
    value === "resolved" ||
    value === "cancelled" ||
    value === "ignored"
  ) {
    return value;
  }

  return "active";
}

function parsePriority(value: string | null): DashboardFilters["priority"] {
  if (value === "all" || value === "p1" || value === "p2" || value === "p3" || value === "p4") {
    return value;
  }

  return "all";
}

function parseSort(value: string | null): DashboardFilters["sort"] {
  if (value === "operations" || value === "dueAt" || value === "updatedAt" || value === "createdAt") {
    return value;
  }

  return "operations";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dashboard = await getDashboardData({
      dateRange: parseDateRange(searchParams.get("dateRange")),
      filters: {
        search: searchParams.get("search") ?? "",
        status: parseStatus(searchParams.get("status")),
        priority: parsePriority(searchParams.get("priority")),
        sort: parseSort(searchParams.get("sort")),
      },
      page: Number(searchParams.get("page") ?? "1"),
      limit: Number(searchParams.get("limit") ?? "12"),
      selectedTaskId: searchParams.get("selectedTaskId"),
    });

    return Response.json({
      ok: true,
      ...dashboard,
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
