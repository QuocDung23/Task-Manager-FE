import { TranslateText, useLocale } from "@/services/i18n";
import { CalendarDays, Clock, Lock } from "lucide-react";
import { formatDateRange, formatLocalDate } from "@/features/tasks/utils/task-schedule";
import type { TaskResponse } from "@/features/tasks/types";

type TaskScheduleBadgeProps = {
  task: TaskResponse;
};

export function TaskScheduleBadge({ task }: TaskScheduleBadgeProps) {
  useLocale();
  if (!task.dueDate && !task.scheduleState) return null;
  if (task.scheduleState === "none") return null;

  if (task.scheduleState === "overdue_locked" || task.lockStatus === "OVERDUE_LOCKED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10.5px] font-medium text-destructive">
        <Lock className="size-3" strokeWidth={1.75} aria-hidden="true" />
        <TranslateText id="task.overdue" />
      </span>
    );
  }

  if (task.scheduleState === "due_soon" && task.dueDate) {
    const label =
      task.startDate && task.dueDate
        ? formatDateRange(task.startDate, task.dueDate)
        : formatLocalDate(task.dueDate);
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10.5px] font-medium text-warning-foreground">
        <Clock className="size-3" strokeWidth={1.75} aria-hidden="true" />
        {label}
      </span>
    );
  }

  if (task.dueDate) {
    const label =
      task.startDate && task.dueDate
        ? formatDateRange(task.startDate, task.dueDate)
        : formatLocalDate(task.dueDate);
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
        <CalendarDays className="size-3" strokeWidth={1.75} aria-hidden="true" />
        {label}
      </span>
    );
  }

  return null;
}
