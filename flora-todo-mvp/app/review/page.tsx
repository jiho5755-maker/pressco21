import { ReviewDashboard } from "../review-dashboard";

type ReviewPageProps = {
  searchParams?: Promise<{
    taskId?: string;
    search?: string;
    status?: string;
    priority?: string;
    page?: string;
    limit?: string;
  }>;
};

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const params = await searchParams;

  return (
    <ReviewDashboard
      initialQuery={{
        taskId: params?.taskId,
        search: params?.search,
        status: params?.status,
        priority: params?.priority,
        page: params?.page,
        limit: params?.limit,
      }}
    />
  );
}
