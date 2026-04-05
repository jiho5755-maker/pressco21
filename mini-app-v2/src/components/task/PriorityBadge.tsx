import { Badge } from "@/components/ui/badge";

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  p1: { label: "긴급", className: "bg-destructive/15 text-destructive hover:bg-destructive/25" },
  p2: { label: "높음", className: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
  p3: { label: "보통", className: "bg-secondary text-muted-foreground hover:bg-secondary/80" },
  p4: { label: "낮음", className: "bg-muted text-muted-foreground/70 hover:bg-muted/80" },
};

export function PriorityBadge({ priority, className = "" }: { priority: string; className?: string }) {
  const config = PRIORITY_CONFIG[priority] ?? { label: priority, className: "bg-secondary text-secondary-foreground" };
  return (
    <Badge variant="secondary" className={`text-[11px] font-medium px-2 py-0.5 ${config.className} ${className}`}>
      {config.label}
    </Badge>
  );
}
