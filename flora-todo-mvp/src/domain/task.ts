export const taskStatuses = ["todo", "waiting", "needs_check", "in_progress", "done"] as const;
export const taskPriorities = ["p1", "p2", "p3", "p4"] as const;
export const reminderStatuses = ["pending", "sent", "cancelled"] as const;
export const followupStatuses = ["open", "waiting", "done"] as const;

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type ReminderStatus = (typeof reminderStatuses)[number];
export type FollowupStatus = (typeof followupStatuses)[number];
