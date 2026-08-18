import type { TaskStatusAction } from "@/features/tasks/types";
import type { LucideIcon } from "lucide-react";
import {
  Circle,
  Rocket,
  GitPullRequest,
  CheckCircle2,
  PauseCircle,
  Wrench,
  Ban,
} from "lucide-react";

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
};

export const STATUS_ACTION_TONE: Record<TaskStatusAction, StatusActionTone> = {
  TODO: "muted",
  IN_PROGRESS: "primary",
  IN_REVIEW: "warning",
  DONE: "success",
  PAUSED: "muted",
  FIXED: "success",
  CANCELLED: "destructive",
};

export type StatusActionMeta = {
  label: string;
  title: string;
  tone: StatusActionTone;
  icon: LucideIcon;
};

export const STATUS_ACTION_META: Record<TaskStatusAction, StatusActionMeta> = {
  TODO: {
    label: "To do",
    title: "Ready to start",
    tone: "muted",
    icon: Circle,
  },
  IN_PROGRESS: {
    label: "In progress",
    title: "Currently being worked on",
    tone: "primary",
    icon: Rocket,
  },
  IN_REVIEW: {
    label: "In review",
    title: "Waiting for review",
    tone: "warning",
    icon: GitPullRequest,
  },
  DONE: {
    label: "Done",
    title: "Work is finished",
    tone: "success",
    icon: CheckCircle2,
  },
  PAUSED: {
    label: "Paused",
    title: "Temporarily halted",
    tone: "muted",
    icon: PauseCircle,
  },
  FIXED: {
    label: "Fixed",
    title: "Issue resolved",
    tone: "success",
    icon: Wrench,
  },
  CANCELLED: {
    label: "Cancelled",
    title: "Work will not continue",
    tone: "destructive",
    icon: Ban,
  },
};

export function getStatusActionMeta(action: TaskStatusAction | undefined): {
  label: string;
  tone: StatusActionTone;
} {
  if (!action) return { label: "No activity yet", tone: "muted" };
  return {
    label: STATUS_ACTION_LABEL[action],
    tone: STATUS_ACTION_TONE[action],
  };
}
