import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  todo: { label: "할일", className: "bg-secondary text-secondary-foreground hover:bg-secondary/80" },
  in_progress: { label: "진행", className: "bg-primary/15 text-primary hover:bg-primary/25" },
  needs_check: { label: "검토", className: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
  waiting: { label: "대기", className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" },
  done: { label: "완료", className: "bg-green-100 text-green-700 hover:bg-green-200" },
  resolved: { label: "해결", className: "bg-green-100 text-green-700 hover:bg-green-200" },
};

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-secondary text-secondary-foreground" };
  return (
    <Badge variant="secondary" className={`text-[11px] font-medium px-2 py-0.5 ${config.className} ${className}`}>
      {config.label}
    </Badge>
  );
}

export function statusLabel(status: string): string {
  return STATUS_CONFIG[status]?.label ?? status;
}
