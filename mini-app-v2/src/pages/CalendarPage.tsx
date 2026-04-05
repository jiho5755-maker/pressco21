import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { WeekView } from "@/components/calendar/WeekView";
import { fetchActiveTasks } from "@/lib/api";
import { Loader2 } from "lucide-react";
import type { Task } from "@/lib/types";

export function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveTasks()
      .then((res) => setTasks(res.explorer?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="캘린더" showBack />

      <main className="max-w-[480px] mx-auto w-full px-4 py-4 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <WeekView tasks={tasks} />
        )}
      </main>
    </div>
  );
}
