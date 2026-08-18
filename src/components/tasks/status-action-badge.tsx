"use client";

import { Lock } from "lucide-react";
import { Circle } from "@phosphor-icons/react";
import type { TaskResponse, TaskStatusAction } from "@/features/tasks/types";
import {
  STATUS_ACTION_META,
  type StatusActionMeta,
  isKnownTaskStatusAction,
} from "@/features/tasks/utils/status-action";

type TaskStatusActionBadgeProps = {
  statusAction: TaskResponse["statusAction"];
  lockStatus: TaskResponse["lockStatus"];
};

const TONE_CLASSES: Record<StatusActionMeta["tone"], string> = {
  primary: "bg-primary/10 text-primary ring-primary/20",
  muted: "bg-muted text-muted-foreground ring-foreground/10",
  success:
    "bg-emerald-500/12 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300",
  warning:
    "bg-amber-500/15 text-amber-800 ring-amber-500/25 dark:text-amber-300",
  destructive: "bg-destructive/12 text-destructive ring-destructive/25",
};

function getMeta(
  action: TaskStatusAction | string | null | undefined,
): StatusActionMeta {
  if (action && isKnownTaskStatusAction(action))
    return STATUS_ACTION_META[action];
  return {
    value: "TODO",
    label: "No status",
    description: "",
    tone: "muted",
    icon: Circle,
  };
}

export function TaskStatusActionBadge({
  statusAction,
  lockStatus,
}: TaskStatusActionBadgeProps) {
  const meta = getMeta(statusAction);
  const Icon = meta.icon;
  const overdueLocked = lockStatus === "OVERDUE_LOCKED";
  const toneClass = TONE_CLASSES[meta.tone];
  const ariaLabel = overdueLocked
    ? `${meta.label} status. Task overdue and locked.`
    : `${meta.label} status.`;

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={`inline-flex h-5 max-w-full items-center gap-1 rounded-full px-1.5 text-[10.5px] font-medium leading-none ring-1 ring-inset ${toneClass}`}
    >
      <Icon className="size-3 shrink-0" weight="light" aria-hidden="true" />
      <span className="truncate">{meta.label}</span>
      {overdueLocked ? (
        <Lock
          className="size-3 shrink-0 text-destructive"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}
