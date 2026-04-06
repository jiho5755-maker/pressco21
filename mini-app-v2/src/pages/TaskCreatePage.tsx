import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/layout/Toast";
import { createTask, fetchStaff } from "@/lib/api";
import { Loader2, Check } from "lucide-react";
import type { StaffMember } from "@/lib/types";

const PRIORITIES: { value: string; label: string; color: string; activeColor: string }[] = [
  { value: "p1", label: "긴급", color: "border-destructive/30 text-destructive", activeColor: "bg-destructive text-white border-destructive" },
  { value: "p2", label: "높음", color: "border-orange-300 text-orange-600", activeColor: "bg-orange-500 text-white border-orange-500" },
  { value: "p3", label: "보통", color: "border-primary/30 text-primary", activeColor: "bg-primary text-primary-foreground border-primary" },
];

function getAvatarColor(name: string): string {
  const colors = [
    "bg-primary/20 text-primary",
    "bg-warm/20 text-[#8b6914]",
    "bg-brand-light/30 text-[#3d5435]",
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function TaskCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [priority, setPriority] = useState("p3");
  const [startAt, setStartAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [relatedProject, setRelatedProject] = useState("");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff()
      .then(setStaff)
      .catch(() => {
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
        startAt: startAt || undefined,
        dueAt: dueAt || undefined,
        relatedProject: relatedProject.trim() || undefined,
        description: description.trim() || undefined,
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
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-5">
            {/* 업무 내용 */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[13px] font-semibold">
                업무 내용 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="무엇을 해야 하나요?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 text-sm"
                autoFocus
              />
            </div>

            {/* 담당자 */}
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold">담당자</Label>
              <div className="flex flex-wrap gap-2">
                {staff.map((member) => {
                  const selected = assignees.includes(member.name);
                  return (
                    <button
                      key={member.name}
                      type="button"
                      onClick={() => toggleAssignee(member.name)}
                      className={`
                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium
                        transition-all duration-150 border
                        ${selected
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "bg-card border-border/60 text-muted-foreground hover:border-border"
                        }
                      `}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className={`text-[9px] font-bold ${getAvatarColor(member.name)}`}>
                          {member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {member.name}
                      {selected && <Check className="h-3 w-3 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 우선순위 */}
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold">우선순위</Label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`
                      flex-1 py-2 rounded-xl text-xs font-semibold border transition-all duration-150
                      ${priority === p.value ? p.activeColor : p.color + " bg-transparent"}
                    `}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 설명/메모 */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[13px] font-semibold">
                설명
              </Label>
              <Textarea
                id="description"
                placeholder="상세 내용이나 메모 (선택)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="min-h-[60px] max-h-[120px] resize-none text-sm"
              />
            </div>

            {/* 시작일 + 마감일 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startAt" className="text-[13px] font-semibold">
                  시작일
                </Label>
                <Input
                  id="startAt"
                  type="date"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="h-11 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueAt" className="text-[13px] font-semibold">
                  마감일
                </Label>
                <Input
                  id="dueAt"
                  type="date"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="h-11 text-sm"
                />
              </div>
            </div>

            {/* 프로젝트 */}
            <div className="space-y-2">
              <Label htmlFor="project" className="text-[13px] font-semibold">
                프로젝트
              </Label>
              <Input
                id="project"
                placeholder="관련 프로젝트 (선택)"
                value={relatedProject}
                onChange={(e) => setRelatedProject(e.target.value)}
                className="h-11 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* 등록 버튼 */}
        <Button
          className="w-full mt-4 h-12 rounded-xl text-sm font-semibold"
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
