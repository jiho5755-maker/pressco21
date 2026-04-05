import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/format";
import type { Comment } from "@/lib/types";

interface CommentListProps {
  comments: Comment[];
}

/** 이름에서 첫 글자 추출 */
function getInitial(name: string): string {
  return name.charAt(0);
}

/** 이름 기반 아바타 색상 */
function getAvatarColor(name: string): string {
  const colors = [
    "bg-primary/20 text-primary",
    "bg-warm/20 text-[#8b6914]",
    "bg-brand-light/40 text-primary",
    "bg-secondary text-secondary-foreground",
    "bg-destructive/15 text-destructive",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        아직 코멘트가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-2.5">
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarFallback
              className={`text-xs font-medium ${getAvatarColor(comment.authorName)}`}
            >
              {getInitial(comment.authorName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-sm font-medium">{comment.authorName}</span>
              <span className="text-[11px] text-muted-foreground">
                {timeAgo(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
