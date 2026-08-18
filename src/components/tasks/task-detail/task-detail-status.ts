import type { TaskStatusAction } from "@/features/tasks/types";
import type { Icon } from "@phosphor-icons/react";
import {
  Archive,
  CheckCircle,
  Circle,
  ClockCountdown,
  Flag,
  Gear,
  GitPullRequest,
  PauseCircle,
  Prohibit,
  RocketLaunch,
  Wrench,
} from "@phosphor-icons/react";

export type StatusActionTone =
  | "primary"
  | "muted"
  | "success"
  | "warning"
  | "destructive";

export const STATUS_ACTION_LABEL: Record<TaskStatusAction, string> = {
  BACKLOG: "Backlog",
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
  BACKLOG: "muted",
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

export type StatusActionMeta = {
  label: string;
  title: string;
  tone: StatusActionTone;
  icon: Icon;
};

export const STATUS_ACTION_META: Record<TaskStatusAction, StatusActionMeta> = {
  BACKLOG: { label: "Backlog", title: "Not planned yet", tone: "muted", icon: Circle },
  TODO: { label: "To do", title: "Ready to start", tone: "muted", icon: Flag },
  IN_PROGRESS: { label: "In progress", title: "Currently being worked on", tone: "primary", icon: Gear },
  IN_REVIEW: { label: "In review", title: "Waiting for review", tone: "warning", icon: GitPullRequest },
  DONE: { label: "Done", title: "Work is finished", tone: "success", icon: CheckCircle },
  PAUSED: { label: "Paused", title: "Temporarily halted", tone: "muted", icon: PauseCircle },
  FIXED: { label: "Fixed", title: "Issue resolved", tone: "success", icon: Wrench },
  CANCELLED: { label: "Cancelled", title: "Work will not continue", tone: "destructive", icon: Prohibit },
  ARCHIVED: { label: "Archived", title: "Hidden from active work", tone: "muted", icon: Archive },
  COMPLETED: { label: "Completed", title: "Work is complete", tone: "success", icon: CheckCircle },
  CREATED: { label: "Created", title: "Task was just created", tone: "primary", icon: RocketLaunch },
  DELETED: { label: "Deleted", title: "Task was removed", tone: "destructive", icon: Prohibit },
  RESTORED: { label: "Restored", title: "Returned to active work", tone: "primary", icon: RocketLaunch },
  UPDATED: { label: "Updated", title: "Task was recently edited", tone: "primary", icon: ClockCountdown },
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
