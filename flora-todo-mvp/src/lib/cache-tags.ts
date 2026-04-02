import { revalidateTag } from "next/cache";

export const DASHBOARD_CACHE_TAG = "flora-todo-dashboard";

export function revalidateDashboardTag() {
  try {
    revalidateTag(DASHBOARD_CACHE_TAG);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (!message.includes("static generation store missing")) {
      throw error;
    }
  }
}
