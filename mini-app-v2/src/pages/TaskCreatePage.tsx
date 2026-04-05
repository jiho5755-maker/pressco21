import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/layout/Toast";
import { createTask, fetchStaff } from "@/lib/api";
import { Loader2 } from "lucide-react";
import type { StaffMember, TaskPriority } from "@/lib/types";

const PRIORITIES: { value: string; label: string }[] = [
  { value: "p1", label: "긴급" },
  { value: "p2", label: "높음" },
  { value: "p3", label: "보통" },
];

export function TaskCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [priority, setPriority] = useState("p3");
  const [dueAt, setDueAt] = useState("");
  const [relatedProject, setRelatedProject] = useState("");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff()
      .then(setStaff)
      .catch(() => {
        // fallback 직원 목록
        setStaff([
          { id: "staff-jiho", name: "장지호", role: "admin" },
          { id: "staff-jaehyuk", name: "이재혁", role: "staff" },
          { id: "staff-seunghae", name: "조승해", role: "staff" },
          { id: "staff-wj", name: "원장님", role: "admin" },
          { id: "staff-dagyeong", name: "장다경", role: "staff" },
        ]);
      });
  }, []);

  function toggleAssignee(name: string) {
    setAssignees((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  async function handleSubmit() {
    if (!title.trim()) {
      showToast("업무 내용을 입력하세요", "error");
      return;
    }

    setSubmitting(true);
    try {
      await createTask({
        title: title.trim(),
        assignee: assignees.length > 0 ? assignees.join(", ") : undefined,
        priority,
        dueAt: dueAt || undefined,
        relatedProject: relatedProject.trim() || undefined,
      });
      showToast("업무가 등록되었습니다", "success");
      navigate("/tasks", { replace: true });
    } catch {
      showToast("업무 등록에 실패했습니다", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="새 업무 등록" showBack />

      <main className="max-w-[480px] mx-auto w-full px-4 py-4 flex-1">
        <Card>
          <CardContent className="p-4 space-y-5">
            {/* 업무 내용 */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                업무 내용 *
              </Label>
              <Input
                id="title"
                placeholder="무엇을 해야 하나요?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* 담당자 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">담당자</Label>
              <div className="flex flex-wrap gap-1.5">
                {staff.map((member) => (
                  <Badge
                    key={member.name}
                    variant={
                      assignees.includes(member.name) ? "default" : "outline"
                    }
                    className="cursor-pointer text-xs py-1 px-2.5"
                    onClick={() => toggleAssignee(member.name)}
                  >
                    {member.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 우선순위 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">우선순위</Label>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => (
                  <Badge
                    key={p.value}
                    variant={priority === p.value ? "default" : "outline"}
                    className={`cursor-pointer text-xs py-1 px-2.5 ${
                      priority === p.value && p.value === "urgent"
                        ? "bg-destructive text-white hover:bg-destructive/90"
                        : ""
                    }`}
                    onClick={() => setPriority(p.value)}
                  >
                    {p.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 마감일 */}
            <div className="space-y-2">
              <Label htmlFor="dueAt" className="text-sm font-medium">
                마감일
              </Label>
              <Input
                id="dueAt"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>

            {/* 프로젝트 */}
            <div className="space-y-2">
              <Label htmlFor="project" className="text-sm font-medium">
                프로젝트
              </Label>
              <Input
                id="project"
                placeholder="관련 프로젝트 (선택)"
                value={relatedProject}
                onChange={(e) => setRelatedProject(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 등록 버튼 */}
        <Button
          className="w-full mt-4 h-11"
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              등록 중...
            </>
          ) : (
            "업무 등록"
          )}
        </Button>
      </main>
    </div>
  );
}
