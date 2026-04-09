import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  maxWidthClassName?: string;
}

export function Header({ title, subtitle, showBack, rightAction, maxWidthClassName = "max-w-[480px]" }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className={`${maxWidthClassName} mx-auto flex items-center h-12 px-4`}>
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-1 -ml-2 h-8 w-8"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {rightAction && <div className="ml-2 flex-shrink-0">{rightAction}</div>}
      </div>
    </header>
  );
}
