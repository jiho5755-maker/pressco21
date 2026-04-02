import { HomeDashboard } from "./home-dashboard";

type HomePageProps = {
  searchParams?: Promise<{
    dateRange?: string;
    search?: string;
    status?: string;
    priority?: string;
    sort?: string;
    page?: string;
    selectedTaskId?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  return (
    <HomeDashboard
      initialQuery={{
        dateRange: params?.dateRange,
        search: params?.search,
        status: params?.status,
        priority: params?.priority,
        sort: params?.sort,
        page: params?.page,
        selectedTaskId: params?.selectedTaskId,
      }}
    />
  );
}
