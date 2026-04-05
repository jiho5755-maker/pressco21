import { Badge } from "@/components/ui/badge";
import type { TaskPriority } from "@/lib/types";

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; className: string }
> = {
  urgent: {
    label: "긴급",
    className: "bg-destructive/15 text-destructive hover:bg-destructive/25",
  },
  high: {
    label: "높음",
    className: "bg-warm/20 text-[#8b6914] hover:bg-warm/30",
  },
  normal: {
    label: "보통",
    className: "bg-secondary text-muted-foreground hover:bg-secondary/80",
  },
  low: {
    label: "낮음",
    className: "bg-muted text-muted-foreground/70 hover:bg-muted/80",
  },
};

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <Badge
      variant="secondary"
      className={`text-[11px] font-medium px-2 py-0.5 ${config.className} ${className}`}
    >
      {config.label}
    </Badge>
  );
}
