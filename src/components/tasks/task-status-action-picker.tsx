"use client";

import { useState } from "react";
import { Check, ChevronDown, Loader2, Circle } from "lucide-react";
import type { TaskResponse, TaskStatusAction } from "@/features/tasks/types";
import { isTaskLocked } from "@/features/tasks/utils/task-schedule";
import {
  TASK_STATUS_ACTION_VALUES,
  isOptionDisabled,
  isKnownTaskStatusAction,
  STATUS_ACTION_META as SHARED_STATUS_ACTION_META,
} from "@/features/tasks/utils/status-action";
import {
  STATUS_ACTION_META,
  type StatusActionMeta,
} from "./task-detail/task-detail-status";
import { useUpdateTaskStatusAction } from "@/features/tasks/hooks/useUpdateTaskStatusAction";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type TaskStatusActionPickerProps = {
  task: TaskResponse;
  isUpdating?: boolean;
  onTaskUpdated?: (task: TaskResponse) => void;
  compact?: boolean;
};

function StatusIcon({
  meta,
  className,
  color,
}: {
  meta: StatusActionMeta;
  className?: string;
  color?: string;
}) {
  const Icon = meta.icon;
  return (
    <Icon
      className={className}
      height={16}
      aria-hidden="true"
      style={color ? { color } : undefined}
    />
  );
}

const STATUS_ICON_COLOR: Record<TaskStatusAction, string> = {
  TODO: "#64748b", // slate-500 (xám)
  IN_PROGRESS: "#3b82f6", // blue-500 (xanh dương)
  IN_REVIEW: "#f59e0b", // amber-500 (vàng)
  DONE: "#10b981", // emerald-500 (xanh lá)
  PAUSED: "#8b5cf6", // violet-500 (tím)
  FIXED: "#f43f5e", // rose-500 (đỏ)
  CANCELLED: "#18181b", // zinc-900 (đen)
};

export function TaskStatusActionPicker({
  task,
  isUpdating = false,
  onTaskUpdated,
  compact = false,
}: TaskStatusActionPickerProps) {
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<TaskStatusAction | null>(
    null,
  );

  const { mutate: updateStatusAction, isPending } = useUpdateTaskStatusAction();

  const currentMeta = isKnownTaskStatusAction(task.statusAction)
    ? STATUS_ACTION_META[task.statusAction]
    : undefined;
  const currentIconColor = isKnownTaskStatusAction(task.statusAction)
    ? STATUS_ICON_COLOR[task.statusAction]
    : undefined;
  const busy = isUpdating || isPending || pendingAction !== null;
  const locked = isTaskLocked(task);
  const overdueLocked = task.lockStatus === "OVERDUE_LOCKED";

  const handleSelect = (statusAction: TaskStatusAction) => {
    if (!isKnownTaskStatusAction(statusAction)) return;
    if (busy || locked || statusAction === task.statusAction) {
      setOpen(false);
      return;
    }
    if (isOptionDisabled(task, statusAction)) {
      setOpen(false);
      return;
    }

    setPendingAction(statusAction);
    updateStatusAction(
      { taskId: task.id, listId: task.listId, statusAction },
      {
        onSuccess: (response) => {
          onTaskUpdated?.(response.data);
          setOpen(false);
          setPendingAction(null);
        },
        onError: () => {
          setPendingAction(null);
          // Popover intentionally stays open so the toast is visible.
        },
      },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={busy || locked}
          aria-busy={busy || undefined}
          aria-label={`Change status. Currently ${currentMeta?.label ?? "No status"}`}
          className={
            compact
              ? "group/status inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-[background-color,transform,color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-60"
              : "group/status flex h-15.5 min-w-0 items-center gap-2.5 rounded-lg bg-background/80 px-3 text-left outline-none ring-1 ring-foreground/7 transition-[background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-background hover:ring-foreground/12 focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.985] disabled:cursor-default disabled:opacity-70"
          }
        >
          <span
            className={
              compact
                ? "grid size-5 place-items-center"
                : `grid size-8 shrink-0 place-items-center rounded-md ${currentMeta ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`
            }
          >
            {currentMeta ? (
              <StatusIcon
                meta={currentMeta}
                className={compact ? "size-4" : "size-4.5"}
                color={currentIconColor}
              />
            ) : (
              <Circle className="size-4" strokeWidth={1.5} aria-hidden="true" />
            )}
          </span>
          {!compact && (
            <span className="min-w-0 flex-1">
              <span className="block text-[10.5px] leading-4 text-muted-foreground">
                Status
              </span>
              <span className="block truncate text-[12.5px] font-medium leading-5 text-foreground">
                {currentMeta?.label ?? "No status"}
              </span>
            </span>
          )}
          {!compact && (
            <ChevronDown
              className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[state=open]/status:rotate-180"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={compact ? "end" : "end"}
        collisionPadding={12}
        className="w-[min(250px,calc(100vw-2rem))] overflow-hidden p-1.5"
      >
        <div className="overflow-hidden rounded-lg bg-background ring-1 ring-foreground/7">
          <div className="px-3 pb-2.5 pt-3">
            <h3 className="text-[13px] font-medium text-foreground">
              Change status
            </h3>
            <p className="mt-0.5 text-[11.5px] leading-4 text-muted-foreground">
              {overdueLocked
                ? "Task is overdue. Only Done is allowed."
                : "Pick a status that matches the current state."}
            </p>
          </div>
          <div className="border-t border-foreground/7 p-1.5">
            <ul className="space-y-1">
              {TASK_STATUS_ACTION_VALUES.map((statusAction) => {
                const meta = SHARED_STATUS_ACTION_META[statusAction];
                const detailedMeta = STATUS_ACTION_META[statusAction];
                const selected = statusAction === task.statusAction;
                const pending = statusAction === pendingAction;
                const disabled =
                  busy || locked || isOptionDisabled(task, statusAction);
                return (
                  <li key={statusAction}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => handleSelect(statusAction)}
                      disabled={disabled}
                      aria-disabled={disabled || undefined}
                      title={
                        overdueLocked && statusAction !== "DONE"
                          ? "Reschedule first or mark done."
                          : undefined
                      }
                      className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left outline-none transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted/70 text-muted-foreground">
                        <StatusIcon
                          meta={detailedMeta}
                          className="size-4"
                          color={STATUS_ICON_COLOR[statusAction]}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] text-foreground/90">
                          {meta.label}
                        </span>
                        <span className="block text-[10.5px] text-muted-foreground">
                          {detailedMeta.title}
                        </span>
                      </span>
                      <span
                        className={`grid size-5 place-items-center rounded-md ring-1 ${selected ? "bg-primary text-primary-foreground ring-primary" : "text-transparent ring-foreground/15"}`}
                      >
                        {pending ? (
                          <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                        ) : (
                          <Check className="size-3" strokeWidth={2} />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
