import { Badge } from "@/components/ui/badge";
import type { TaskStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  todo: {
    label: "할일",
    className: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  },
  in_progress: {
    label: "진행",
    className: "bg-primary/15 text-primary hover:bg-primary/25",
  },
  review: {
    label: "검토",
    className: "bg-warm/20 text-[#8b6914] hover:bg-warm/30",
  },
  done: {
    label: "완료",
    className: "bg-brand-light/30 text-primary hover:bg-brand-light/40",
  },
};

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge
      variant="secondary"
      className={`text-[11px] font-medium px-2 py-0.5 ${config.className} ${className}`}
    >
      {config.label}
    </Badge>
  );
}

/** 상태의 한글 라벨 */
export function statusLabel(status: TaskStatus): string {
  return STATUS_CONFIG[status]?.label ?? status;
}
