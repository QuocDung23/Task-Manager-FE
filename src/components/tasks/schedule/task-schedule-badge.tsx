import { CalendarDays, Clock, Lock } from "lucide-react";
import { formatLocalDate } from "@/features/tasks/utils/task-schedule";
import type { TaskResponse } from "@/features/tasks/types";

type TaskScheduleBadgeProps = {
  task: TaskResponse;
};

export function TaskScheduleBadge({ task }: TaskScheduleBadgeProps) {
  if (!task.dueDate && !task.scheduleState) return null;
  if (task.scheduleState === "none") return null;

  if (task.scheduleState === "overdue_locked" || task.lockStatus === "OVERDUE_LOCKED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10.5px] font-medium text-destructive">
        <Lock className="size-3" strokeWidth={1.75} aria-hidden="true" />
        Overdue
      </span>
    );
  }

  if (task.scheduleState === "due_soon" && task.dueDate) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10.5px] font-medium text-warning-foreground">
        <Clock className="size-3" strokeWidth={1.75} aria-hidden="true" />
        {formatLocalDate(task.dueDate)}
      </span>
    );
  }

  if (task.dueDate) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
        <CalendarDays className="size-3" strokeWidth={1.75} aria-hidden="true" />
        {formatLocalDate(task.dueDate)}
      </span>
    );
  }

  return null;
}