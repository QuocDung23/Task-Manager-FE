import type { Icon } from "@phosphor-icons/react";
import {
  CheckCircle,
  Circle,
  GitPullRequest,
  PauseCircle,
  Prohibit,
  RocketLaunch,
  Wrench,
} from "@phosphor-icons/react";
import type { TaskResponse, TaskStatusAction } from "../types";
import { t, type TranslationKey } from "@/services/i18n";

export const TASK_STATUS_ACTION_VALUES: readonly TaskStatusAction[] = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "PAUSED",
  "FIXED",
  "CANCELLED",
] as const;

export type StatusActionTone =
  | "primary"
  | "muted"
  | "success"
  | "warning"
  | "destructive";

export type StatusActionMeta = {
  value: TaskStatusAction;
  label: string;
  description: string;
  tone: StatusActionTone;
  icon: Icon;
};

export const STATUS_ACTION_META: Record<TaskStatusAction, StatusActionMeta> = {
  TODO: {
    value: "TODO",
    label: "To do",
    description: "Not started yet.",
    tone: "muted",
    icon: Circle,
  },
  IN_PROGRESS: {
    value: "IN_PROGRESS",
    label: "In progress",
    description: "Actively being worked on.",
    tone: "primary",
    icon: RocketLaunch,
  },
  IN_REVIEW: {
    value: "IN_REVIEW",
    label: "In review",
    description: "Awaiting feedback or approval.",
    tone: "warning",
    icon: GitPullRequest,
  },
  DONE: {
    value: "DONE",
    label: "Done",
    description: "Work is finished.",
    tone: "success",
    icon: CheckCircle,
  },
  PAUSED: {
    value: "PAUSED",
    label: "Paused",
    description: "Work is temporarily halted.",
    tone: "muted",
    icon: PauseCircle,
  },
  FIXED: {
    value: "FIXED",
    label: "Fixed",
    description: "A reported issue has been resolved.",
    tone: "success",
    icon: Wrench,
  },
  CANCELLED: {
    value: "CANCELLED",
    label: "Cancelled",
    description: "Work will not continue.",
    tone: "destructive",
    icon: Prohibit,
  },
};

const STATUS_KEYS: Record<TaskStatusAction, { label: TranslationKey; description: TranslationKey }> = {
  TODO: { label: "status.todo", description: "status.todoDescription" },
  IN_PROGRESS: { label: "status.inProgress", description: "status.progressDescription" },
  IN_REVIEW: { label: "status.inReview", description: "status.reviewDescription" },
  DONE: { label: "status.done", description: "status.doneDescription" },
  PAUSED: { label: "status.paused", description: "status.pausedDescription" },
  FIXED: { label: "status.fixed", description: "status.fixedDescription" },
  CANCELLED: { label: "status.cancelled", description: "status.cancelledDescription" },
};

export function getLocalizedStatusActionMeta(value: TaskStatusAction): StatusActionMeta {
  const meta = STATUS_ACTION_META[value];
  const keys = STATUS_KEYS[value];
  return { ...meta, label: t(keys.label), description: t(keys.description) };
}

export function isKnownTaskStatusAction(
  value: string | null | undefined,
): value is TaskStatusAction {
  return typeof value === "string" && value in STATUS_ACTION_META;
}

export function getStatusActionMeta(
  value: TaskStatusAction | string | null | undefined,
): StatusActionMeta {
  if (value && isKnownTaskStatusAction(value)) {
    return getLocalizedStatusActionMeta(value);
  }
  return {
    value: "TODO",
    label: t("status.noActivity"),
    description: "",
    tone: "muted",
    icon: Circle,
  };
}

export function isOverdueLocked(task: Pick<TaskResponse, "lockStatus">): boolean {
  return task.lockStatus === "OVERDUE_LOCKED";
}

export function isOptionDisabled(
  task: Pick<TaskResponse, "lockStatus">,
  option: TaskStatusAction,
): boolean {
  if (!isOverdueLocked(task)) return false;
  return option !== "DONE";
}
