import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { fetchActiveTasks, fetchMe } from "@/lib/api";
import { getTelegramUserName } from "@/lib/telegram";
import { ClipboardList, CalendarDays, Truck, PlusCircle, AlertTriangle } from "lucide-react";
import type { Task } from "@/lib/types";

export function HomePage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("...");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tgName = getTelegramUserName();
    if (tgName) {
      setUserName(tgName);
    } else {
      fetchMe()
        .then((me) => setUserName(me?.name ?? "관리자"))
        .catch(() => setUserName("관리자"));
    }

    fetchActiveTasks()
      .then((res) => setTasks(res.explorer?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const todoCount = tasks.filter((t) => t.status === "todo" || t.status === "in_progress").length;
  const urgentCount = tasks.filter((t) => t.priority === "p1").length;
  const reviewCount = tasks.filter((t) => t.status === "needs_check").length;
  const shipmentCount = tasks.filter(
    (t) => t.category === "shipment" || t.title?.startsWith("[출고]")
  ).length;

  const menuCards = [
    {
      icon: <ClipboardList className="h-6 w-6 text-primary" />,
      label: "업무 보드",
      path: "/tasks",
      badge: todoCount > 0 ? todoCount + "건" : undefined,
    },
    {
      icon: <CalendarDays className="h-6 w-6 text-primary" />,
      label: "캘린더",
      path: "/calendar",
    },
    {
      icon: <Truck className="h-6 w-6 text-primary" />,
      label: "출고",
      path: "/shipment",
      badge: shipmentCount > 0 ? shipmentCount + "건" : undefined,
    },
    {
      icon: <PlusCircle className="h-6 w-6 text-primary" />,
      label: "새 업무 등록",
      path: "/tasks/new",
    },
  ];

  return (
    <div>
      <Header title="PRESSCO21 업무도구" />
      <main className="max-w-[480px] mx-auto px-4 py-5">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground">{userName}님, 안녕하세요</h2>
          {!loading && urgentCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              긴급 업무가 {urgentCount}건 있습니다
            </p>
          )}
          {!loading && urgentCount === 0 && todoCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">처리할 업무가 {todoCount}건 있습니다</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {menuCards.map((card) => (
            <Card
              key={card.path}
              className="cursor-pointer active:scale-[0.97] transition-transform duration-150 hover:shadow-md"
              onClick={() => navigate(card.path)}
            >
              <CardContent className="p-4 flex flex-col items-center gap-2 relative">
                {card.badge && (
                  <Badge className="absolute top-2 right-2 text-[10px] px-1.5 py-0 h-4">
                    {card.badge}
                  </Badge>
                )}
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {card.icon}
                </div>
                <span className="text-sm font-medium">{card.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {!loading && tasks.length > 0 && (
          <Card className="mt-5">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">업무 현황</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "할일", count: tasks.filter((t) => t.status === "todo").length },
                  { label: "진행", count: tasks.filter((t) => t.status === "in_progress").length },
                  { label: "검토", count: reviewCount },
                  { label: "긴급", count: urgentCount, danger: true },
                ].map((item) => (
                  <div key={item.label}>
                    <p className={`text-xl font-bold ${item.danger && item.count > 0 ? "text-destructive" : "text-primary"}`}>
                      {item.count}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
