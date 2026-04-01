export const taskStatuses = ["todo", "waiting", "done"] as const;
export const taskPriorities = ["low", "normal", "high"] as const;
export const reminderStatuses = ["pending", "sent", "cancelled"] as const;
export const followupStatuses = ["open", "waiting", "done"] as const;

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type ReminderStatus = (typeof reminderStatuses)[number];
export type FollowupStatus = (typeof followupStatuses)[number];
