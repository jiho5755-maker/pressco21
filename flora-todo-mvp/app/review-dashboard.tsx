"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useDeferredValue, useEffect, useState, useTransition } from "react";
import { followupStatuses, reminderStatuses, taskPriorities, taskStatuses } from "@/src/domain/task";

type SummaryData = {
  todo: number;
  waiting: number;
  done: number;
  today: number;
  thisWeek: number;
  topPriority: number;
  upcoming: number;
  generatedAt: string;
};

type ReminderItem = {
  id: string;
  taskId: string;
  title: string;
  remindAt: string | null;
  kind: string;
  message: string | null;
  status: string;
  updatedAt: string;
};

type FollowupItem = {
  id: string;
  taskId: string;
  subject: string;
  followupType: string;
  waitingFor: string | null;
  nextCheckAt: string | null;
  status: string;
  lastNote: string | null;
  updatedAt: string;
};

type ReviewItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  dueAt: string | null;
  waitingFor: string | null;
  relatedProject: string | null;
  sourceText: string;
  sourceChannel: string;
  sourceMessageId: string;
  reviewedAt: string | null;
  updatedAt: string;
  reminders: ReminderItem[];
  followups: FollowupItem[];
};

type ReviewQueueResponse = {
  ok: true;
  items: ReviewItem[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

type Notice = {
  tone: "success" | "error";
  text: string;
} | null;

type TaskDraft = {
  title: string;
  status: string;
  priority: string;
  category: string;
  dueAt: string;
  waitingFor: string;
  relatedProject: string;
};

type ReminderDraft = {
  title: string;
  remindAt: string;
  kind: string;
  message: string;
  status: string;
};

type FollowupDraft = {
  subject: string;
  followupType: string;
  waitingFor: string;
  nextCheckAt: string;
  status: string;
  lastNote: string;
};

type FieldProps = {
  label: string;
  children: ReactNode;
  fullWidth?: boolean;
};

const summaryCards: Array<{ label: string; key: keyof SummaryData }> = [
  { label: "Todo", key: "todo" },
  { label: "Waiting", key: "waiting" },
  { label: "Done", key: "done" },
  { label: "Today", key: "today" },
  { label: "This Week", key: "thisWeek" },
  { label: "P1", key: "topPriority" },
  { label: "Upcoming", key: "upcoming" },
];

const defaultReviewFilters = {
  search: "",
  status: "all",
  priority: "all",
  limit: 12,
};

const defaultQueueMeta = {
  page: 1,
  limit: 12,
  totalCount: 0,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};

function buildMessageId() {
  return `ui-${Date.now()}`;
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function Field({ label, children, fullWidth = false }: FieldProps) {
  return (
    <label className={fullWidth ? "review-field review-field-wide" : "review-field"}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function buildTaskDraft(item: ReviewItem): TaskDraft {
  return {
    title: item.title,
    status: item.status,
    priority: item.priority,
    category: item.category,
    dueAt: toDateTimeLocal(item.dueAt),
    waitingFor: item.waitingFor ?? "",
    relatedProject: item.relatedProject ?? "",
  };
}

function buildReminderDraft(item: ReminderItem): ReminderDraft {
  return {
    title: item.title,
    remindAt: toDateTimeLocal(item.remindAt),
    kind: item.kind,
    message: item.message ?? "",
    status: item.status,
  };
}

function buildFollowupDraft(item: FollowupItem): FollowupDraft {
  return {
    subject: item.subject,
    followupType: item.followupType,
    waitingFor: item.waitingFor ?? "",
    nextCheckAt: toDateTimeLocal(item.nextCheckAt),
    status: item.status,
    lastNote: item.lastNote ?? "",
  };
}

type ReminderEditorProps = {
  item: ReminderItem;
  onSave: (id: string, payload: Record<string, string | null>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function ReminderEditor({ item, onSave, onDelete }: ReminderEditorProps) {
  const [draft, setDraft] = useState<ReminderDraft>(() => buildReminderDraft(item));

  useEffect(() => {
    setDraft(buildReminderDraft(item));
  }, [item]);

  return (
    <div className="review-subcard">
      <div className="review-subcard-header">
        <strong>Reminder</strong>
        <span>{formatTimestamp(item.updatedAt)}</span>
      </div>
      <div className="review-grid">
        <Field label="Title" fullWidth>
          <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
        </Field>
        <Field label="Remind At">
          <input
            type="datetime-local"
            value={draft.remindAt}
            onChange={(event) => setDraft((current) => ({ ...current, remindAt: event.target.value }))}
          />
        </Field>
        <Field label="Kind">
          <input value={draft.kind} onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value }))} />
        </Field>
        <Field label="Status">
          <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            {reminderStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
            <option value="done">done</option>
          </select>
        </Field>
        <Field label="Message" fullWidth>
          <textarea
            rows={2}
            value={draft.message}
            onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))}
          />
        </Field>
      </div>
      <div className="review-actions">
        <button
          type="button"
          onClick={() =>
            onSave(item.id, {
              title: draft.title,
              remindAt: draft.remindAt || null,
              kind: draft.kind,
              message: draft.message || null,
              status: draft.status,
            })
          }
        >
          Save Reminder
        </button>
        <button type="button" className="button-danger" onClick={() => onDelete(item.id)}>
          Delete Reminder
        </button>
      </div>
    </div>
  );
}

type FollowupEditorProps = {
  item: FollowupItem;
  onSave: (id: string, payload: Record<string, string | null>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function FollowupEditor({ item, onSave, onDelete }: FollowupEditorProps) {
  const [draft, setDraft] = useState<FollowupDraft>(() => buildFollowupDraft(item));

  useEffect(() => {
    setDraft(buildFollowupDraft(item));
  }, [item]);

  return (
    <div className="review-subcard">
      <div className="review-subcard-header">
        <strong>Follow-up</strong>
        <span>{formatTimestamp(item.updatedAt)}</span>
      </div>
      <div className="review-grid">
        <Field label="Subject" fullWidth>
          <input value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} />
        </Field>
        <Field label="Type">
          <input
            value={draft.followupType}
            onChange={(event) => setDraft((current) => ({ ...current, followupType: event.target.value }))}
          />
        </Field>
        <Field label="Waiting For">
          <input
            value={draft.waitingFor}
            onChange={(event) => setDraft((current) => ({ ...current, waitingFor: event.target.value }))}
          />
        </Field>
        <Field label="Next Check">
          <input
            type="datetime-local"
            value={draft.nextCheckAt}
            onChange={(event) => setDraft((current) => ({ ...current, nextCheckAt: event.target.value }))}
          />
        </Field>
        <Field label="Status">
          <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            {followupStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Last Note" fullWidth>
          <textarea
            rows={2}
            value={draft.lastNote}
            onChange={(event) => setDraft((current) => ({ ...current, lastNote: event.target.value }))}
          />
        </Field>
      </div>
      <div className="review-actions">
        <button
          type="button"
          onClick={() =>
            onSave(item.id, {
              subject: draft.subject,
              followupType: draft.followupType,
              waitingFor: draft.waitingFor || null,
              nextCheckAt: draft.nextCheckAt || null,
              status: draft.status,
              lastNote: draft.lastNote || null,
            })
          }
        >
          Save Follow-up
        </button>
        <button type="button" className="button-danger" onClick={() => onDelete(item.id)}>
          Delete Follow-up
        </button>
      </div>
    </div>
  );
}

type TaskCardProps = {
  item: ReviewItem;
  isFocused: boolean;
  onSaveTask: (id: string, payload: Record<string, string | boolean | null>) => Promise<void>;
  onIgnoreTask: (id: string) => Promise<void>;
  onSaveReminder: (id: string, payload: Record<string, string | null>) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
  onSaveFollowup: (id: string, payload: Record<string, string | null>) => Promise<void>;
  onDeleteFollowup: (id: string) => Promise<void>;
};

function TaskCard({
  item,
  isFocused,
  onSaveTask,
  onIgnoreTask,
  onSaveReminder,
  onDeleteReminder,
  onSaveFollowup,
  onDeleteFollowup,
}: TaskCardProps) {
  const [draft, setDraft] = useState<TaskDraft>(() => buildTaskDraft(item));

  useEffect(() => {
    setDraft(buildTaskDraft(item));
  }, [item]);

  return (
    <article id={`task-${item.id}`} className={isFocused ? "review-card review-card-focused" : "review-card"}>
      <header className="review-card-header">
        <div>
          <p className="review-eyebrow">
            {item.sourceChannel} / {item.sourceMessageId}
          </p>
          <h2>{item.title}</h2>
        </div>
        <div className="review-meta">
          <span>{item.status}</span>
          <span>{item.priority}</span>
          <span>{formatTimestamp(item.reviewedAt)}</span>
        </div>
      </header>

      <div className="review-source">
        <div>
          <strong>Source Text</strong>
          <pre>{item.sourceText}</pre>
        </div>
      </div>

      <div className="review-grid">
        <Field label="Title" fullWidth>
          <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
        </Field>
        <Field label="Status">
          <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            {taskStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>
            {taskPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} />
        </Field>
        <Field label="Due At">
          <input
            type="datetime-local"
            value={draft.dueAt}
            onChange={(event) => setDraft((current) => ({ ...current, dueAt: event.target.value }))}
          />
        </Field>
        <Field label="Waiting For">
          <input
            value={draft.waitingFor}
            onChange={(event) => setDraft((current) => ({ ...current, waitingFor: event.target.value }))}
          />
        </Field>
        <Field label="Related Project">
          <input
            value={draft.relatedProject}
            onChange={(event) => setDraft((current) => ({ ...current, relatedProject: event.target.value }))}
          />
        </Field>
      </div>

      <div className="review-actions">
        <button
          type="button"
          onClick={() =>
            onSaveTask(item.id, {
              title: draft.title,
              status: draft.status,
              priority: draft.priority,
              category: draft.category,
              dueAt: draft.dueAt || null,
              waitingFor: draft.waitingFor || null,
              relatedProject: draft.relatedProject || null,
            })
          }
        >
          Save Task
        </button>
        <button type="button" className="button-danger" onClick={() => onIgnoreTask(item.id)}>
          Ignore Task
        </button>
      </div>

      <section className="review-section">
        <div className="review-section-header">
          <h3>Reminders</h3>
          <span>{item.reminders.length}</span>
        </div>
        {item.reminders.length === 0 ? (
          <p className="review-empty">No reminders</p>
        ) : (
          item.reminders.map((reminder) => (
            <ReminderEditor
              key={`${reminder.id}-${reminder.updatedAt}`}
              item={reminder}
              onSave={onSaveReminder}
              onDelete={onDeleteReminder}
            />
          ))
        )}
      </section>

      <section className="review-section">
        <div className="review-section-header">
          <h3>Follow-ups</h3>
          <span>{item.followups.length}</span>
        </div>
        {item.followups.length === 0 ? (
          <p className="review-empty">No follow-ups</p>
        ) : (
          item.followups.map((followup) => (
            <FollowupEditor
              key={`${followup.id}-${followup.updatedAt}`}
              item={followup}
              onSave={onSaveFollowup}
              onDelete={onDeleteFollowup}
            />
          ))
        )}
      </section>
    </article>
  );
}

async function readJson<T>(path: string, options?: RequestInit) {
  const headers = new Headers(options?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const payload = (await response.json()) as T & { ok?: boolean; error?: string };
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }

  return payload;
}

type ReviewDashboardProps = {
  initialQuery?: {
    taskId?: string;
    search?: string;
    status?: string;
    priority?: string;
    page?: string;
    limit?: string;
  };
};

function parseInitialPage(value?: string) {
  const parsed = Number(value ?? "1");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseInitialLimit(value?: string) {
  const parsed = Number(value ?? "12");
  return [12, 24, 48].includes(parsed) ? parsed : 12;
}

export function ReviewDashboard({ initialQuery }: ReviewDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const initialTaskId = initialQuery?.taskId ?? null;
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(initialTaskId);
  const [queueTaskId, setQueueTaskId] = useState<string | null>(initialTaskId);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [queueMeta, setQueueMeta] = useState(defaultQueueMeta);
  const [queuePage, setQueuePage] = useState(parseInitialPage(initialQuery?.page));
  const [filters, setFilters] = useState({
    search: initialQuery?.search ?? defaultReviewFilters.search,
    status: initialQuery?.status ?? defaultReviewFilters.status,
    priority: initialQuery?.priority ?? defaultReviewFilters.priority,
    limit: parseInitialLimit(initialQuery?.limit),
  });
  const [notice, setNotice] = useState<Notice>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(filters.search);
  const [compose, setCompose] = useState({
    sourceChannel: "browser-review",
    sourceMessageId: buildMessageId(),
    text: "다음주 월요일 안소영 연락 대기",
  });

  async function refreshData(showLoading = false) {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams({
        limit: String(filters.limit),
        page: String(queuePage),
        status: filters.status,
        priority: filters.priority,
      });

      if (deferredSearch.trim()) {
        params.set("search", deferredSearch.trim());
      }

      if (queueTaskId) {
        params.set("taskId", queueTaskId);
      }

      const [summaryResponse, reviewResponse] = await Promise.all([
        readJson<{ ok: true; summary: SummaryData }>("/api/summary"),
        readJson<ReviewQueueResponse>(`/api/admin/review?${params.toString()}`),
      ]);

      setSummary(summaryResponse.summary);
      setItems(reviewResponse.items);
      setQueueMeta({
        page: reviewResponse.page,
        limit: reviewResponse.limit,
        totalCount: reviewResponse.totalCount,
        totalPages: reviewResponse.totalPages,
        hasPreviousPage: reviewResponse.hasPreviousPage,
        hasNextPage: reviewResponse.hasNextPage,
      });
      setNotice(null);

      if (reviewResponse.page !== queuePage) {
        setQueuePage(reviewResponse.page);
      }

      if (queueTaskId) {
        setQueueTaskId(null);
      }
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshData(true);
  }, [queuePage, filters.limit, filters.priority, filters.status, deferredSearch, queueTaskId]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (focusedTaskId) {
      params.set("taskId", focusedTaskId);
    }

    if (deferredSearch.trim()) {
      params.set("search", deferredSearch.trim());
    }

    if (filters.status !== "all") {
      params.set("status", filters.status);
    }

    if (filters.priority !== "all") {
      params.set("priority", filters.priority);
    }

    if (queuePage > 1) {
      params.set("page", String(queuePage));
    }

    if (filters.limit !== defaultReviewFilters.limit) {
      params.set("limit", String(filters.limit));
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl as never, { scroll: false });
  }, [deferredSearch, filters.limit, filters.priority, filters.status, focusedTaskId, pathname, queuePage, router]);

  useEffect(() => {
    if (!focusedTaskId || items.length === 0) {
      return;
    }

    const element = document.getElementById(`task-${focusedTaskId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusedTaskId, items]);

  async function mutate(
    action: () => Promise<void>,
    successText: string,
  ) {
    try {
      await action();
      setNotice({ tone: "success", text: successText });
      startTransition(() => {
        void refreshData();
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다.",
      });
    }
  }

  async function handleComposeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await mutate(async () => {
      await readJson("/api/ingest", {
        method: "POST",
        body: JSON.stringify(compose),
      });
      setCompose((current) => ({
        ...current,
        sourceMessageId: buildMessageId(),
        text: "",
      }));
    }, "메모를 적재했습니다.");
  }

  function updateFilters(patch: Partial<typeof defaultReviewFilters>) {
    setFilters((current) => ({
      ...current,
      ...patch,
    }));
    setQueueTaskId(null);
    setQueuePage(1);
  }

  return (
    <main className="review-shell">
      <section className="review-hero">
        <div>
          <p className="review-kicker">Flora Todo MVP</p>
          <h1>Sprint 3 Review Desk</h1>
          <p className="review-description">
            ingest, summary, review/admin 수정 루프를 한 화면에서 검증합니다.
            task, reminder, follow-up를 실제 endpoint로 수정하고 review queue를 필터와 페이지 단위로 탐색합니다.
          </p>
        </div>
        <div className="review-hero-actions">
          <button type="button" onClick={() => void refreshData(true)} disabled={isLoading || isPending}>
            Reload
          </button>
          <Link href="/">Home Dashboard</Link>
          <span>{isLoading || isPending ? "Refreshing..." : "Live DB connected"}</span>
        </div>
      </section>

      {notice ? (
        <div className={notice.tone === "success" ? "review-banner review-banner-success" : "review-banner review-banner-error"}>
          {notice.text}
        </div>
      ) : null}

      <section className="review-top-grid">
        <form className="review-panel" onSubmit={handleComposeSubmit}>
          <div className="review-panel-header">
            <h2>Quick Ingest</h2>
            <span>POST /api/ingest</span>
          </div>
          <div className="review-grid">
            <Field label="Source Channel">
              <input
                value={compose.sourceChannel}
                onChange={(event) => setCompose((current) => ({ ...current, sourceChannel: event.target.value }))}
              />
            </Field>
            <Field label="Source Message ID">
              <input
                value={compose.sourceMessageId}
                onChange={(event) => setCompose((current) => ({ ...current, sourceMessageId: event.target.value }))}
              />
            </Field>
            <Field label="Text" fullWidth>
              <textarea
                rows={5}
                value={compose.text}
                onChange={(event) => setCompose((current) => ({ ...current, text: event.target.value }))}
              />
            </Field>
          </div>
          <div className="review-actions">
            <button type="submit" disabled={isPending}>
              Ingest Memo
            </button>
          </div>
        </form>

        <section className="review-panel">
          <div className="review-panel-header">
            <h2>Summary</h2>
            <span>{summary ? formatTimestamp(summary.generatedAt) : "—"}</span>
          </div>
          <div className="review-summary-grid">
            {summaryCards.map((card) => (
              <div key={card.key} className="review-stat">
                <span>{card.label}</span>
                <strong>{summary ? String(summary[card.key]) : "—"}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="review-panel">
        <div className="review-panel-header">
          <h2>Review Queue</h2>
          <span>
            {queueMeta.totalCount} items / {queueMeta.page} of {queueMeta.totalPages}
          </span>
        </div>

        <div className="review-toolbar">
          <div className="dashboard-filter-grid review-control-grid">
            <label>
              <span>Search</span>
              <input
                value={filters.search}
                onChange={(event) => updateFilters({ search: event.target.value })}
                placeholder="제목, 원문, 대기자, 프로젝트"
              />
            </label>
            <label>
              <span>Status</span>
              <select value={filters.status} onChange={(event) => updateFilters({ status: event.target.value })}>
                <option value="all">all</option>
                {taskStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Priority</span>
              <select value={filters.priority} onChange={(event) => updateFilters({ priority: event.target.value })}>
                <option value="all">all</option>
                {taskPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Page Size</span>
              <select value={filters.limit} onChange={(event) => updateFilters({ limit: Number(event.target.value) })}>
                {[12, 24, 48].map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="review-pagination-meta">
            <span>{deferredSearch.trim() ? `"${deferredSearch.trim()}" 검색 적용` : "전체 queue 기준"}</span>
            {focusedTaskId ? <span>focus: {focusedTaskId.slice(0, 8)}</span> : null}
          </div>
        </div>

        {isLoading ? <p className="review-empty">Loading review queue...</p> : null}

        {!isLoading && items.length === 0 ? <p className="review-empty">Review queue is empty.</p> : null}

        <div className="review-list">
          {items.map((item) => (
            <TaskCard
              key={`${item.id}-${item.updatedAt}`}
              item={item}
              isFocused={focusedTaskId === item.id}
              onSaveTask={(id, payload) =>
                mutate(
                  async () => {
                    await readJson(`/api/admin/tasks/${id}`, {
                      method: "PATCH",
                      body: JSON.stringify(payload),
                    });
                  },
                  "Task를 저장했습니다.",
                )
              }
              onIgnoreTask={(id) =>
                mutate(
                  async () => {
                    await readJson(`/api/admin/tasks/${id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ ignored: true }),
                    });
                  },
                  "Task를 ignore 처리했습니다.",
                )
              }
              onSaveReminder={(id, payload) =>
                mutate(
                  async () => {
                    await readJson(`/api/admin/reminders/${id}`, {
                      method: "PATCH",
                      body: JSON.stringify(payload),
                    });
                  },
                  "Reminder를 저장했습니다.",
                )
              }
              onDeleteReminder={(id) =>
                mutate(
                  async () => {
                    await readJson(`/api/admin/reminders/${id}`, {
                      method: "DELETE",
                    });
                  },
                  "Reminder를 삭제했습니다.",
                )
              }
              onSaveFollowup={(id, payload) =>
                mutate(
                  async () => {
                    await readJson(`/api/admin/followups/${id}`, {
                      method: "PATCH",
                      body: JSON.stringify(payload),
                    });
                  },
                  "Follow-up을 저장했습니다.",
                )
              }
              onDeleteFollowup={(id) =>
                mutate(
                  async () => {
                    await readJson(`/api/admin/followups/${id}`, {
                      method: "DELETE",
                    });
                  },
                  "Follow-up을 삭제했습니다.",
                )
              }
            />
          ))}
        </div>

        {!isLoading && queueMeta.totalCount > 0 ? (
          <div className="review-pagination">
            <div className="review-pagination-meta">
              <span>{queueMeta.totalCount} total</span>
              <span>
                page {queueMeta.page} / {queueMeta.totalPages}
              </span>
            </div>
            <div className="review-pagination-actions">
              <button
                type="button"
                className="button-secondary"
                disabled={!queueMeta.hasPreviousPage || isLoading || isPending}
                onClick={() => {
                  setQueueTaskId(null);
                  setQueuePage((current) => Math.max(1, current - 1));
                }}
              >
                Previous
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={!queueMeta.hasNextPage || isLoading || isPending}
                onClick={() => {
                  setQueueTaskId(null);
                  setQueuePage((current) => current + 1);
                }}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
