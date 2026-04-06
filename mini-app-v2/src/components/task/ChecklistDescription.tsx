import { useState, useCallback } from "react";
import { CheckSquare, Square, ListChecks } from "lucide-react";

interface ChecklistDescriptionProps {
  description: string;
  onUpdate: (newDescription: string) => void;
  readOnly?: boolean;
}

interface ParsedLine {
  type: "checkbox" | "text";
  checked: boolean;
  text: string;
}

function parseLines(description: string): ParsedLine[] {
  return description.split("\n").map((line) => {
    const unchecked = line.match(/^- \[ \] (.*)$/);
    const checked = line.match(/^- \[[xX]\] (.*)$/);
    if (unchecked) return { type: "checkbox", checked: false, text: unchecked[1] };
    if (checked) return { type: "checkbox", checked: true, text: checked[1] };
    return { type: "text", checked: false, text: line };
  });
}

function toDescription(lines: ParsedLine[]): string {
  return lines
    .map((l) => (l.type === "checkbox" ? `- [${l.checked ? "x" : " "}] ${l.text}` : l.text))
    .join("\n");
}

export function ChecklistDescription({ description, onUpdate, readOnly = false }: ChecklistDescriptionProps) {
  const [lines, setLines] = useState(() => parseLines(description));

  const checklistCount = lines.filter((l) => l.type === "checkbox").length;
  const checkedCount = lines.filter((l) => l.type === "checkbox" && l.checked).length;

  const handleToggle = useCallback(
    (index: number) => {
      if (readOnly) return;
      setLines((prev) => {
        const next = prev.map((l, i) => (i === index ? { ...l, checked: !l.checked } : l));
        onUpdate(toDescription(next));
        return next;
      });
    },
    [readOnly, onUpdate],
  );

  return (
    <div>
      {/* 진행률 */}
      {checklistCount > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <ListChecks className="h-3.5 w-3.5 text-primary" />
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${checklistCount > 0 ? (checkedCount / checklistCount) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">
            {checkedCount}/{checklistCount}
          </span>
        </div>
      )}

      {/* 줄별 렌더링 */}
      <div className="space-y-0.5">
        {lines.map((line, i) => {
          if (line.type === "checkbox") {
            return (
              <button
                key={i}
                type="button"
                className={`flex items-start gap-2 w-full text-left py-0.5 rounded-md transition-colors ${
                  !readOnly ? "hover:bg-muted/40 active:bg-muted/60 cursor-pointer" : ""
                }`}
                onClick={() => handleToggle(i)}
                disabled={readOnly}
              >
                {line.checked ? (
                  <CheckSquare className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                )}
                <span
                  className={`text-sm leading-relaxed ${
                    line.checked ? "line-through text-muted-foreground/60" : "text-foreground/85"
                  }`}
                >
                  {line.text}
                </span>
              </button>
            );
          }

          if (!line.text.trim()) return <div key={i} className="h-1.5" />;

          return (
            <p key={i} className="text-sm text-foreground/85 leading-relaxed">
              {line.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}
