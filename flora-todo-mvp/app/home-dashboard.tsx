"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useDeferredValue, useEffect, useState, useTransition } from "react";
import { followupStatuses, reminderStatuses, taskPriorities, taskStatuses } from "@/src/domain/task";
import { getTaskNextReminderAt, getTaskScheduleAt } from "@/src/lib/dashboard";
import {
  DashboardDateRange,
  DashboardFilters,
  DashboardFollowup,
  DashboardPayload,
  DashboardReminder,
  DashboardSummary,
  DashboardTask,
} from "@/src/types/dashboard";

type HomeDashboardProps = {
  initialQuery?: {
    dateRange?: string;
    search?: string;
    status?: string;
    priority?: string;
    sort?: string;
    page?: string;
    selectedTaskId?: string;
  };
};

type Notice = {
  tone: "success" | "error";
  text: string;
} | null;

type TaskEditDraft = {
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

const defaultFilters: DashboardFilters = {
  search: "",
  status: "active",
  priority: "all",
  sort: "operations",
};

const defaultExplorerLimit = 12;

const summaryCardDescriptions: Record<keyof Omit<DashboardSummary, "generatedAt">, string> = {
  todo: "바로 움직여야 하는 실행건",
  waiting: "외부 회신/승인 대기",
  today: "오늘 안에 끝낼 항목",
  thisWeek: "이번주 안에 밀어야 할 건",
  upcoming: "선택 범위 일정/리마인드",
  topPriority: "최상위 우선순위 풀",
};

const summaryCardOrder: Array<keyof Omit<DashboardSummary, "generatedAt">> = [
  "todo",
  "waiting",
  "today",
  "thisWeek",
  "upcoming",
  "topPriority",
];

const rangeOptions: Array<{
  value: DashboardDateRange;
  label: string;
  title: string;
  caption: string;
}> = [
  {
    value: "today",
    label: "오늘",
    title: "오늘 집중 범위",
    caption: "오늘 due/remind 기준으로 핵심 task를 압축합니다.",
  },
  {
    value: "thisWeek",
    label: "이번주",
    title: "이번주 핵심",
    caption: "이번주 안에 밀어야 하는 일정/리마인드를 봅니다.",
  },
  {
    value: "next7Days",
    label: "다음 7일",
    title: "다음 7일 핵심",
    caption: "다음 7일 안에 닥치는 일정까지 미리 봅니다.",
  },
];

function formatTimestamp(value: string | Date | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function toDateTimeLocal(value: string | Date | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getSourcePreview(text: string, maxLength = 96) {
  const compact = text.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength)}...`;
}

function buildTaskDraft(task: DashboardTask): TaskEditDraft {
  return {
    title: task.title,
    status: task.status,
    priority: task.priority,
    category: task.category,
    dueAt: toDateTimeLocal(task.dueAt),
    waitingFor: task.waitingFor ?? "",
    relatedProject: task.relatedProject ?? "",
  };
}

function buildReminderDraft(reminder?: DashboardReminder): ReminderDraft {
  return {
    title: reminder?.title ?? "",
    remindAt: toDateTimeLocal(reminder?.remindAt),
    kind: reminder?.kind ?? "manual",
    message: reminder?.message ?? "",
    status: reminder?.status ?? "pending",
  };
}

function buildFollowupDraft(followup?: DashboardFollowup): FollowupDraft {
  return {
    subject: followup?.subject ?? "",
    followupType: followup?.followupType ?? "manual",
    waitingFor: followup?.waitingFor ?? "",
    nextCheckAt: toDateTimeLocal(followup?.nextCheckAt),
    status: followup?.status ?? "open",
    lastNote: followup?.lastNote ?? "",
  };
}

function getTaskMeta(task: DashboardTask) {
  const scheduleAt = getTaskScheduleAt(task);
  if (scheduleAt) {
    return formatTimestamp(scheduleAt);
  }

  return task.waitingFor ? `대기: ${task.waitingFor}` : task.category;
}

function parseInitialDateRange(value?: string): DashboardDateRange {
  if (value === "today" || value === "thisWeek" || value === "next7Days") {
    return value;
  }

  return "thisWeek";
}

function parseInitialStatus(value?: string): DashboardFilters["status"] {
  if (
    value === "all" ||
    value === "active" ||
    value === "todo" ||
    value === "waiting" ||
    value === "needs_check" ||
    value === "in_progress" ||
    value === "done" ||
    value === "resolved" ||
    value === "cancelled" ||
    value === "ignored"
  ) {
    return value;
  }

  return defaultFilters.status;
}

function parseInitialPriority(value?: string): DashboardFilters["priority"] {
  if (value === "all" || value === "p1" || value === "p2" || value === "p3" || value === "p4") {
    return value;
  }

  return defaultFilters.priority;
}

function parseInitialSort(value?: string): DashboardFilters["sort"] {
  if (value === "operations" || value === "dueAt" || value === "updatedAt" || value === "createdAt") {
    return value;
  }

  return defaultFilters.sort;
}

function parseInitialPage(value?: string) {
  const parsed = Number(value ?? "1");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function Field({ label, children, fullWidth = false }: FieldProps) {
  return (
    <label className={fullWidth ? "review-field review-field-wide" : "review-field"}>
      <span>{label}</span>
      {children}
    </label>
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

function buildDashboardRequestPath(input: {
  dateRange: DashboardDateRange;
  filters: DashboardFilters;
  page: number;
  selectedTaskId: string | null;
}) {
  const params = new URLSearchParams();
  params.set("dateRange", input.dateRange);

  if (input.filters.search.trim()) {
    params.set("search", input.filters.search.trim());
  }

  if (input.filters.status !== defaultFilters.status) {
    params.set("status", input.filters.status);
  }

  if (input.filters.priority !== defaultFilters.priority) {
    params.set("priority", input.filters.priority);
  }

  if (input.filters.sort !== defaultFilters.sort) {
    params.set("sort", input.filters.sort);
  }

  if (input.page > 1) {
    params.set("page", String(input.page));
  }

  params.set("limit", String(defaultExplorerLimit));

  if (input.selectedTaskId) {
    params.set("selectedTaskId", input.selectedTaskId);
  }

  return `/api/dashboard?${params.toString()}`;
}

type TaskButtonProps = {
  task: DashboardTask;
  isSelected: boolean;
  onSelect: (taskId: string) => void;
  accent?: "normal" | "priority" | "waiting";
};

function TaskButton({ task, isSelected, onSelect, accent = "normal" }: TaskButtonProps) {
  const className = [
    "dashboard-task-button",
    accent !== "normal" ? `dashboard-task-button-${accent}` : "",
    isSelected ? "dashboard-task-button-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={className} onClick={() => onSelect(task.id)}>
      <div className="dashboard-task-topline">
        <strong>{task.title}</strong>
        <span>{task.priority}</span>
      </div>
      <div className="dashboard-task-tags">
        <span>{task.status}</span>
        <span>{task.category}</span>
      </div>
      <p>{getSourcePreview(task.sourceText, 88)}</p>
      <small>{getTaskMeta(task)}</small>
    </button>
  );
}

type DashboardSectionProps = {
  title: string;
  caption: string;
  empty: string;
  items: DashboardTask[];
  selectedTaskId: string | null;
  onSelect: (taskId: string) => void;
  accent?: "normal" | "priority" | "waiting";
};

function DashboardSection({
  title,
  caption,
  empty,
  items,
  selectedTaskId,
  onSelect,
  accent = "normal",
}: DashboardSectionProps) {
  return (
    <section className="dashboard-panel">
      <div className="dashboard-panel-header">
        <div>
          <h2>{title}</h2>
          <p>{caption}</p>
        </div>
        <span>{items.length}</span>
      </div>

      {items.length === 0 ? <p className="dashboard-empty">{empty}</p> : null}

      <div className="dashboard-task-list">
        {items.map((task) => (
          <TaskButton
            key={`${title}-${task.id}-${task.updatedAt}`}
            task={task}
            isSelected={selectedTaskId === task.id}
            onSelect={onSelect}
            accent={accent}
          />
        ))}
      </div>
    </section>
  );
}

type ReminderEditorProps = {
  reminder: DashboardReminder;
  isPending: boolean;
  onSave: (reminderId: string, payload: Record<string, string | null>) => Promise<void>;
  onDelete: (reminderId: string) => Promise<void>;
};

function ReminderEditor({ reminder, isPending, onSave, onDelete }: ReminderEditorProps) {
  const [draft, setDraft] = useState<ReminderDraft>(() => buildReminderDraft(reminder));

  useEffect(() => {
    setDraft(buildReminderDraft(reminder));
  }, [reminder]);

  return (
    <div className="review-subcard">
      <div className="review-subcard-header">
        <strong>Reminder</strong>
        <span>{formatTimestamp(reminder.updatedAt)}</span>
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
          disabled={isPending}
          onClick={() =>
            onSave(reminder.id, {
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
        <button type="button" className="button-danger" disabled={isPending} onClick={() => onDelete(reminder.id)}>
          Delete Reminder
        </button>
      </div>
    </div>
  );
}

type ReminderComposerProps = {
  isPending: boolean;
  onCreate: (payload: Record<string, string | null>) => Promise<void>;
};

function ReminderComposer({ isPending, onCreate }: ReminderComposerProps) {
  const [draft, setDraft] = useState<ReminderDraft>(() => buildReminderDraft());

  return (
    <div className="review-subcard">
      <div className="review-subcard-header">
        <strong>New Reminder</strong>
        <span>POST /api/admin/reminders</span>
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
          disabled={isPending || !draft.title.trim() || !draft.remindAt}
          onClick={async () => {
            await onCreate({
              title: draft.title,
              remindAt: draft.remindAt,
              kind: draft.kind,
              message: draft.message || null,
              status: draft.status,
            });
            setDraft(buildReminderDraft());
          }}
        >
          Add Reminder
        </button>
      </div>
    </div>
  );
}

type FollowupEditorProps = {
  followup: DashboardFollowup;
  isPending: boolean;
  onSave: (followupId: string, payload: Record<string, string | null>) => Promise<void>;
  onDelete: (followupId: string) => Promise<void>;
};

function FollowupEditor({ followup, isPending, onSave, onDelete }: FollowupEditorProps) {
  const [draft, setDraft] = useState<FollowupDraft>(() => buildFollowupDraft(followup));

  useEffect(() => {
    setDraft(buildFollowupDraft(followup));
  }, [followup]);

  return (
    <div className="review-subcard">
      <div className="review-subcard-header">
        <strong>Follow-up</strong>
        <span>{formatTimestamp(followup.updatedAt)}</span>
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
          disabled={isPending}
          onClick={() =>
            onSave(followup.id, {
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
        <button type="button" className="button-danger" disabled={isPending} onClick={() => onDelete(followup.id)}>
          Delete Follow-up
        </button>
      </div>
    </div>
  );
}

type FollowupComposerProps = {
  isPending: boolean;
  onCreate: (payload: Record<string, string | null>) => Promise<void>;
};

function FollowupComposer({ isPending, onCreate }: FollowupComposerProps) {
  const [draft, setDraft] = useState<FollowupDraft>(() => buildFollowupDraft());

  return (
    <div className="review-subcard">
      <div className="review-subcard-header">
        <strong>New Follow-up</strong>
        <span>POST /api/admin/followups</span>
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
          disabled={isPending || !draft.subject.trim()}
          onClick={async () => {
            await onCreate({
              subject: draft.subject,
              followupType: draft.followupType,
              waitingFor: draft.waitingFor || null,
              nextCheckAt: draft.nextCheckAt || null,
              status: draft.status,
              lastNote: draft.lastNote || null,
            });
            setDraft(buildFollowupDraft());
          }}
        >
          Add Follow-up
        </button>
      </div>
    </div>
  );
}

type DetailPanelProps = {
  task: DashboardTask | null;
  isPending: boolean;
  onSaveTask: (taskId: string, payload: Record<string, string | null>) => Promise<void>;
  onIgnoreTask: (taskId: string) => Promise<void>;
  onSaveReminder: (reminderId: string, payload: Record<string, string | null>) => Promise<void>;
  onDeleteReminder: (reminderId: string) => Promise<void>;
  onCreateReminder: (taskId: string, payload: Record<string, string | null>) => Promise<void>;
  onSaveFollowup: (followupId: string, payload: Record<string, string | null>) => Promise<void>;
  onDeleteFollowup: (followupId: string) => Promise<void>;
  onCreateFollowup: (taskId: string, payload: Record<string, string | null>) => Promise<void>;
};

function DetailPanel({
  task,
  isPending,
  onSaveTask,
  onIgnoreTask,
  onSaveReminder,
  onDeleteReminder,
  onCreateReminder,
  onSaveFollowup,
  onDeleteFollowup,
  onCreateFollowup,
}: DetailPanelProps) {
  const [draft, setDraft] = useState<TaskEditDraft | null>(task ? buildTaskDraft(task) : null);

  useEffect(() => {
    setDraft(task ? buildTaskDraft(task) : null);
  }, [task]);

  if (!task || !draft) {
    return (
      <aside className="dashboard-detail dashboard-panel">
        <div className="dashboard-panel-header">
          <div>
            <h2>Task Detail</h2>
            <p>좌측 카드에서 작업을 고르면 상세가 열립니다.</p>
          </div>
        </div>
        <p className="dashboard-empty">선택된 task가 없습니다.</p>
      </aside>
    );
  }

  const nextReminderAt = getTaskNextReminderAt(task);

  return (
    <aside className="dashboard-detail dashboard-panel">
      <div className="dashboard-panel-header">
        <div>
          <h2>{task.title}</h2>
          <p>
            {task.sourceChannel} / {task.sourceMessageId}
          </p>
        </div>
        <div className="dashboard-pill-row">
          <span>{task.status}</span>
          <span>{task.priority}</span>
        </div>
      </div>

      <dl className="dashboard-detail-grid">
        <div>
          <dt>title</dt>
          <dd>{task.title}</dd>
        </div>
        <div>
          <dt>status</dt>
          <dd>{task.status}</dd>
        </div>
        <div>
          <dt>priority</dt>
          <dd>{task.priority}</dd>
        </div>
        <div>
          <dt>category</dt>
          <dd>{task.category}</dd>
        </div>
        <div>
          <dt>due_at</dt>
          <dd>{formatTimestamp(task.dueAt)}</dd>
        </div>
        <div>
          <dt>waiting_for</dt>
          <dd>{task.waitingFor ?? "—"}</dd>
        </div>
        <div>
          <dt>related_project</dt>
          <dd>{task.relatedProject ?? "—"}</dd>
        </div>
        <div>
          <dt>next_reminder</dt>
          <dd>{formatTimestamp(nextReminderAt)}</dd>
        </div>
      </dl>

      <div className="dashboard-inline-panel">
        <div className="dashboard-mini-header">
          <h3>Inline Admin</h3>
          <span>PATCH /api/admin/tasks/:id</span>
        </div>
        <div className="dashboard-inline-grid">
          <label className="review-field review-field-wide">
            <span>Title</span>
            <input value={draft.title} onChange={(event) => setDraft((current) => (current ? { ...current, title: event.target.value } : current))} />
          </label>
          <label className="review-field">
            <span>Status</span>
            <select value={draft.status} onChange={(event) => setDraft((current) => (current ? { ...current, status: event.target.value } : current))}>
              {taskStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="review-field">
            <span>Priority</span>
            <select
              value={draft.priority}
              onChange={(event) => setDraft((current) => (current ? { ...current, priority: event.target.value } : current))}
            >
              {taskPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label className="review-field">
            <span>Category</span>
            <input
              value={draft.category}
              onChange={(event) => setDraft((current) => (current ? { ...current, category: event.target.value } : current))}
            />
          </label>
          <label className="review-field">
            <span>Due At</span>
            <input
              type="datetime-local"
              value={draft.dueAt}
              onChange={(event) => setDraft((current) => (current ? { ...current, dueAt: event.target.value } : current))}
            />
          </label>
          <label className="review-field">
            <span>Waiting For</span>
            <input
              value={draft.waitingFor}
              onChange={(event) => setDraft((current) => (current ? { ...current, waitingFor: event.target.value } : current))}
            />
          </label>
          <label className="review-field review-field-wide">
            <span>Related Project</span>
            <input
              value={draft.relatedProject}
              onChange={(event) => setDraft((current) => (current ? { ...current, relatedProject: event.target.value } : current))}
            />
          </label>
        </div>
        <div className="dashboard-inline-actions">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              onSaveTask(task.id, {
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
          <button type="button" className="button-secondary" disabled={isPending} onClick={() => setDraft(buildTaskDraft(task))}>
            Reset
          </button>
          <button type="button" className="button-danger" disabled={isPending} onClick={() => onIgnoreTask(task.id)}>
            Ignore Task
          </button>
        </div>
      </div>

      <section className="dashboard-source-box">
        <strong>source_text</strong>
        <pre>{task.sourceText}</pre>
      </section>

      <div className="dashboard-subsections">
        <section>
          <div className="dashboard-mini-header">
            <h3>Reminders</h3>
            <span>{task.reminders.length}</span>
          </div>
          {task.reminders.length === 0 ? <p className="dashboard-empty">등록된 reminder 없음</p> : null}
          {task.reminders.map((reminder) => (
            <ReminderEditor
              key={`${reminder.id}-${reminder.updatedAt}`}
              reminder={reminder}
              isPending={isPending}
              onSave={onSaveReminder}
              onDelete={onDeleteReminder}
            />
          ))}
          <ReminderComposer
            key={`${task.id}-reminder-compose`}
            isPending={isPending}
            onCreate={(payload) => onCreateReminder(task.id, payload)}
          />
        </section>

        <section>
          <div className="dashboard-mini-header">
            <h3>Follow-ups</h3>
            <span>{task.followups.length}</span>
          </div>
          {task.followups.length === 0 ? <p className="dashboard-empty">등록된 follow-up 없음</p> : null}
          {task.followups.map((followup) => (
            <FollowupEditor
              key={`${followup.id}-${followup.updatedAt}`}
              followup={followup}
              isPending={isPending}
              onSave={onSaveFollowup}
              onDelete={onDeleteFollowup}
            />
          ))}
          <FollowupComposer
            key={`${task.id}-followup-compose`}
            isPending={isPending}
            onCreate={(payload) => onCreateFollowup(task.id, payload)}
          />
        </section>
      </div>

      <div className="dashboard-detail-actions">
        <Link href={`/review?taskId=${task.id}`}>Review Desk에서 수정</Link>
        <Link href="/review">전체 Review/Admin 보기</Link>
      </div>
    </aside>
  );
}

export function HomeDashboard({ initialQuery }: HomeDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialQuery?.selectedTaskId ?? null);
  const [filters, setFilters] = useState<DashboardFilters>({
    search: initialQuery?.search ?? defaultFilters.search,
    status: parseInitialStatus(initialQuery?.status),
    priority: parseInitialPriority(initialQuery?.priority),
    sort: parseInitialSort(initialQuery?.sort),
  });
  const [dateRange, setDateRange] = useState<DashboardDateRange>(parseInitialDateRange(initialQuery?.dateRange));
  const [explorerPage, setExplorerPage] = useState(parseInitialPage(initialQuery?.page));
  const [notice, setNotice] = useState<Notice>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(filters.search);

  async function refreshData(showLoading = false, requestedTaskId?: string | null) {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const response = await readJson<DashboardPayload>(
        buildDashboardRequestPath({
          dateRange,
          filters: {
            ...filters,
            search: deferredSearch,
          },
          page: explorerPage,
          selectedTaskId: requestedTaskId ?? selectedTaskId,
        }),
      );

      setDashboard(response);
      setNotice(null);

      const nextSelectedTaskId = response.selectedTask?.id ?? null;
      if (nextSelectedTaskId !== selectedTaskId) {
        setSelectedTaskId(nextSelectedTaskId);
      }
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "대시보드를 불러오지 못했습니다.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function mutate(action: () => Promise<void>, successText: string) {
    try {
      await action();
      setNotice({ tone: "success", text: successText });
      startTransition(() => {
        void refreshData(false, selectedTaskId);
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다.",
      });
    }
  }

  useEffect(() => {
    void refreshData(true);
  }, [dateRange, deferredSearch, filters.priority, filters.sort, filters.status, explorerPage]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (dateRange !== "thisWeek") {
      params.set("dateRange", dateRange);
    }

    if (deferredSearch.trim()) {
      params.set("search", deferredSearch.trim());
    }

    if (filters.status !== defaultFilters.status) {
      params.set("status", filters.status);
    }

    if (filters.priority !== defaultFilters.priority) {
      params.set("priority", filters.priority);
    }

    if (filters.sort !== defaultFilters.sort) {
      params.set("sort", filters.sort);
    }

    if (explorerPage > 1) {
      params.set("page", String(explorerPage));
    }

    if (selectedTaskId) {
      params.set("selectedTaskId", selectedTaskId);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl as never, { scroll: false });
  }, [dateRange, deferredSearch, explorerPage, filters.priority, filters.sort, filters.status, pathname, router, selectedTaskId]);

  function updateFilters(patch: Partial<DashboardFilters>) {
    setFilters((current) => ({
      ...current,
      ...patch,
    }));
    setExplorerPage(1);
  }

  function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId);
    startTransition(() => {
      void refreshData(false, taskId);
    });
  }

  const selectedRange = rangeOptions.find((option) => option.value === dateRange) ?? rangeOptions[1];
  const summary = dashboard?.summary ?? null;
  const sections = dashboard?.sections;
  const explorer = dashboard?.explorer;
  const selectedTask = dashboard?.selectedTask ?? null;

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-kicker">Flora Todo MVP Sprint 3</p>
          <h1>홈 대시보드</h1>
          <p className="dashboard-description">
            오늘 무엇부터 처리해야 하는지, 어디가 막혀 있는지, 최근에 어떤 메모가 구조화됐는지를 한 화면에 모읍니다.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <button type="button" onClick={() => startTransition(() => void refreshData(true, selectedTaskId))} disabled={isLoading || isPending}>
            Reload Dashboard
          </button>
          <Link href="/review">Review/Admin</Link>
          <span>{isLoading || isPending ? "Refreshing..." : "Live DB connected"}</span>
        </div>
      </section>

      {notice ? (
        <div className={notice.tone === "success" ? "review-banner review-banner-success" : "review-banner review-banner-error"}>
          {notice.text}
        </div>
      ) : null}

      <section className="dashboard-scope-bar dashboard-panel">
        <div className="dashboard-panel-header">
          <div>
            <h2>운영 범위</h2>
            <p>{selectedRange.caption}</p>
          </div>
          <span>{dashboard?.inScopeCount ?? 0} tasks in scope</span>
        </div>
        <div className="dashboard-chip-row">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === dateRange ? "dashboard-chip dashboard-chip-active" : "dashboard-chip"}
              onClick={() => {
                setDateRange(option.value);
                setExplorerPage(1);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-summary-grid">
        {summaryCardOrder.map((key) => (
          <article key={key} className="dashboard-stat">
            <span>{key}</span>
            <strong>{summary ? String(summary[key]) : "—"}</strong>
            <p>{summaryCardDescriptions[key]}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-filter-bar dashboard-panel">
        <div className="dashboard-panel-header">
          <div>
            <h2>Task Explorer</h2>
            <p>운영 확인용 필터/정렬 영역입니다.</p>
          </div>
          <span>{explorer?.totalCount ?? 0} visible</span>
        </div>
        <div className="dashboard-filter-grid">
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
            <select
              value={filters.status}
              onChange={(event) => updateFilters({ status: event.target.value as DashboardFilters["status"] })}
            >
              <option value="active">active only</option>
              <option value="all">all</option>
              <option value="todo">todo</option>
              <option value="waiting">waiting</option>
              <option value="needs_check">needs_check</option>
              <option value="in_progress">in_progress</option>
              <option value="done">done</option>
              <option value="resolved">resolved</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>
          <label>
            <span>Priority</span>
            <select
              value={filters.priority}
              onChange={(event) => updateFilters({ priority: event.target.value as DashboardFilters["priority"] })}
            >
              <option value="all">all</option>
              <option value="p1">p1</option>
              <option value="p2">p2</option>
              <option value="p3">p3</option>
              <option value="p4">p4</option>
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select
              value={filters.sort}
              onChange={(event) => updateFilters({ sort: event.target.value as DashboardFilters["sort"] })}
            >
              <option value="operations">operations</option>
              <option value="dueAt">due_at asc</option>
              <option value="updatedAt">updated_at desc</option>
              <option value="createdAt">created_at desc</option>
            </select>
          </label>
        </div>
      </section>

      <section className="dashboard-main-grid">
        <div className="dashboard-section-grid">
          <DashboardSection
            title="최우선"
            caption="p1 우선, 없으면 p2 풀"
            empty="표시할 최우선 task가 없습니다."
            items={sections?.topPriority ?? []}
            selectedTaskId={selectedTaskId}
            onSelect={handleSelectTask}
            accent="priority"
          />
          <DashboardSection
            title="오늘 할 일"
            caption="today 기준 작업"
            empty="오늘로 잡힌 task가 없습니다."
            items={sections?.today ?? []}
            selectedTaskId={selectedTaskId}
            onSelect={handleSelectTask}
          />
          <DashboardSection
            title={selectedRange.title}
            caption={selectedRange.caption}
            empty={`${selectedRange.label} 범위 핵심 task가 없습니다.`}
            items={sections?.focus ?? []}
            selectedTaskId={selectedTaskId}
            onSelect={handleSelectTask}
          />
          <DashboardSection
            title="대기건"
            caption="waiting 상태만 모음"
            empty="대기건이 없습니다."
            items={sections?.waiting ?? []}
            selectedTaskId={selectedTaskId}
            onSelect={handleSelectTask}
            accent="waiting"
          />
          <DashboardSection
            title="일정 임박"
            caption={`${selectedRange.label} 범위의 remind_at / due_at 가까운 순`}
            empty={`${selectedRange.label} 범위에서 가까운 일정이 없습니다.`}
            items={sections?.upcoming ?? []}
            selectedTaskId={selectedTaskId}
            onSelect={handleSelectTask}
          />
          <DashboardSection
            title="최근 입력 / 최근 구조화"
            caption="최근 ingest task + source_text 일부"
            empty="최근 입력 이력이 없습니다."
            items={sections?.recent ?? []}
            selectedTaskId={selectedTaskId}
            onSelect={handleSelectTask}
          />
        </div>

        <DetailPanel
          task={selectedTask}
          isPending={isPending}
          onSaveTask={(taskId, payload) =>
            mutate(
              async () => {
                await readJson(`/api/admin/tasks/${taskId}`, {
                  method: "PATCH",
                  body: JSON.stringify(payload),
                });
              },
              "Task를 저장했습니다.",
            )
          }
          onIgnoreTask={(taskId) =>
            mutate(
              async () => {
                await readJson(`/api/admin/tasks/${taskId}`, {
                  method: "PATCH",
                  body: JSON.stringify({ ignored: true }),
                });
              },
              "Task를 ignore 처리했습니다.",
            )
          }
          onSaveReminder={(reminderId, payload) =>
            mutate(
              async () => {
                await readJson(`/api/admin/reminders/${reminderId}`, {
                  method: "PATCH",
                  body: JSON.stringify(payload),
                });
              },
              "Reminder를 저장했습니다.",
            )
          }
          onDeleteReminder={(reminderId) =>
            mutate(
              async () => {
                await readJson(`/api/admin/reminders/${reminderId}`, {
                  method: "DELETE",
                });
              },
              "Reminder를 삭제했습니다.",
            )
          }
          onCreateReminder={(taskId, payload) =>
            mutate(
              async () => {
                await readJson("/api/admin/reminders", {
                  method: "POST",
                  body: JSON.stringify({
                    taskId,
                    ...payload,
                  }),
                });
              },
              "Reminder를 추가했습니다.",
            )
          }
          onSaveFollowup={(followupId, payload) =>
            mutate(
              async () => {
                await readJson(`/api/admin/followups/${followupId}`, {
                  method: "PATCH",
                  body: JSON.stringify(payload),
                });
              },
              "Follow-up을 저장했습니다.",
            )
          }
          onDeleteFollowup={(followupId) =>
            mutate(
              async () => {
                await readJson(`/api/admin/followups/${followupId}`, {
                  method: "DELETE",
                });
              },
              "Follow-up을 삭제했습니다.",
            )
          }
          onCreateFollowup={(taskId, payload) =>
            mutate(
              async () => {
                await readJson("/api/admin/followups", {
                  method: "POST",
                  body: JSON.stringify({
                    taskId,
                    ...payload,
                  }),
                });
              },
              "Follow-up을 추가했습니다.",
            )
          }
        />
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel-header">
          <div>
            <h2>Explorer Results</h2>
            <p>필터/정렬 결과를 바로 클릭해 상세와 review desk로 이어집니다.</p>
          </div>
          <span>{explorer?.totalCount ?? 0}</span>
        </div>

        {isLoading ? <p className="dashboard-empty">대시보드 데이터를 읽는 중입니다...</p> : null}
        {!isLoading && (explorer?.items.length ?? 0) === 0 ? <p className="dashboard-empty">현재 필터 조건에 맞는 task가 없습니다.</p> : null}

        <div className="dashboard-explorer-list">
          {(explorer?.items ?? []).map((task) => (
            <button
              key={`explorer-${task.id}-${task.updatedAt}`}
              type="button"
              className={selectedTaskId === task.id ? "dashboard-explorer-row dashboard-explorer-row-active" : "dashboard-explorer-row"}
              onClick={() => handleSelectTask(task.id)}
            >
              <div>
                <strong>{task.title}</strong>
                <p>{getSourcePreview(task.sourceText, 120)}</p>
              </div>
              <div className="dashboard-explorer-meta">
                <span>{task.status}</span>
                <span>{task.priority}</span>
                <span>{formatTimestamp(task.updatedAt)}</span>
              </div>
            </button>
          ))}
        </div>

        {explorer && explorer.totalCount > 0 ? (
          <div className="dashboard-pagination">
            <div className="dashboard-pagination-meta">
              <span>{explorer.totalCount} total</span>
              <span>
                page {explorer.page} / {explorer.totalPages}
              </span>
            </div>
            <div className="dashboard-pagination-actions">
              <button
                type="button"
                className="button-secondary"
                disabled={!explorer.hasPreviousPage || isLoading || isPending}
                onClick={() => setExplorerPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={!explorer.hasNextPage || isLoading || isPending}
                onClick={() => setExplorerPage((current) => current + 1)}
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
