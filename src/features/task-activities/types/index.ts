export type TaskActivityType =
  | "TASK_CREATED"
  | "TASK_NAME_CHANGED"
  | "TASK_DESCRIPTION_CHANGED"
  | "TASK_ASSIGNEE_ADDED"
  | "TASK_ASSIGNEE_REMOVED"
  | "TASK_TAG_ADDED"
  | "TASK_TAG_REMOVED"
  | "TASK_SCHEDULE_SET"
  | "TASK_RESCHEDULED"
  | "TASK_SCHEDULE_CLEARED"
  | "TASK_DUE_SOON"
  | "TASK_OVERDUE_LOCKED"
  | "TASK_UNLOCKED"
  | "TASK_STATUS_CHANGED";

export type TaskActivity = {
  id: string;
  taskId: string;
  type: TaskActivityType;
  actor: { id: string; name: string; avatar: string | null } | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type TaskActivityListResponse = {
  success: true;
  data: { items: TaskActivity[]; nextCursor: string | null };
};
