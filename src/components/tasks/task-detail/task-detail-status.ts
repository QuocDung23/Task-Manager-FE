import type { TaskStatusAction } from "@/features/tasks/types";

export type StatusActionTone =
  | "primary"
  | "muted"
  | "success"
  | "warning"
  | "destructive";

export const STATUS_ACTION_LABEL: Record<TaskStatusAction, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
  PAUSED: "Paused",
  FIXED: "Fixed",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
  COMPLETED: "Completed",
  CREATED: "Created",
  DELETED: "Deleted",
  RESTORED: "Restored",
  UPDATED: "Updated",
};

export const STATUS_ACTION_TONE: Record<TaskStatusAction, StatusActionTone> = {
  TODO: "muted",
  IN_PROGRESS: "primary",
  IN_REVIEW: "warning",
  DONE: "success",
  PAUSED: "muted",
  FIXED: "success",
  CANCELLED: "destructive",
  ARCHIVED: "muted",
  COMPLETED: "success",
  CREATED: "primary",
  DELETED: "destructive",
  RESTORED: "primary",
  UPDATED: "primary",
};

export function getStatusActionMeta(action: TaskStatusAction | undefined): {
  label: string;
  tone: StatusActionTone;
} {
  if (!action) return { label: "No activity yet", tone: "muted" };
  const known = STATUS_ACTION_LABEL[action];
  if (known) return { label: known, tone: STATUS_ACTION_TONE[action] };
  const pretty = action
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { label: pretty, tone: "muted" };
}