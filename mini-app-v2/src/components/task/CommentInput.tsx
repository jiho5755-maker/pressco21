import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  disabled?: boolean;
}

export function CommentInput({ onSubmit, disabled }: CommentInputProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = content.trim().length > 0 && !submitting && !disabled;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent("");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="sticky bottom-0 bg-background border-t border-border p-3">
      <div className="max-w-[480px] mx-auto flex items-end gap-2">
        <Textarea
          placeholder="코멘트 입력..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="min-h-[40px] max-h-[120px] resize-none text-sm"
          disabled={disabled}
        />
        <Button
          size="icon"
          className="h-10 w-10 flex-shrink-0"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
