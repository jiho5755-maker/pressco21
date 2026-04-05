import { useState, useEffect, useCallback, createContext, useContext } from "react";
import type { ReactNode } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  showToast: (
    message: string,
    type?: "success" | "error" | "info",
    action?: ToastItem["action"]
  ) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (
      message: string,
      type: "success" | "error" | "info" = "info",
      action?: ToastItem["action"]
    ) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type, action }]);
    },
    []
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-[448px]">
        {toasts.map((toast) => (
          <ToastMessage
            key={toast.id}
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastMessage({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bgClass =
    toast.type === "error"
      ? "bg-destructive text-white"
      : toast.type === "success"
        ? "bg-primary text-primary-foreground"
        : "bg-card text-card-foreground border border-border";

  return (
    <div
      className={`rounded-lg px-4 py-3 shadow-lg text-sm flex items-center justify-between gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200 ${bgClass}`}
    >
      <span className="flex-1">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          className="font-medium underline underline-offset-2 flex-shrink-0"
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
