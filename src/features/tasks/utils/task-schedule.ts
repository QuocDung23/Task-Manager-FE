import type {
  ReminderPresetId,
  TaskLockStatus,
  TaskResponse,
  TaskScheduleState,
} from "../types";

export const REMINDER_PRESETS: ReadonlyArray<{
  id: ReminderPresetId;
  label: string;
  description: string;
  minutes: number | null;
}> = [
  { id: "AT_TIME", label: "At due time", description: "Notify when the task is due", minutes: 0 },
  { id: "BEFORE_15", label: "15 minutes before", description: "Notify 15 minutes before the deadline", minutes: 15 },
  { id: "BEFORE_30", label: "30 minutes before", description: "Notify 30 minutes before the deadline", minutes: 30 },
  { id: "BEFORE_60", label: "1 hour before", description: "Notify 1 hour before the deadline", minutes: 60 },
  { id: "BEFORE_DAY", label: "1 day before", description: "Notify 1 day before the deadline", minutes: 60 * 24 },
  { id: "CUSTOM", label: "Custom", description: "Pick a custom date and time", minutes: null },
];

const TERMINAL_STATUS_ACTIONS = new Set<string>(["DONE", "CANCELLED"]);

export function isTerminalTask(task: Pick<TaskResponse, "statusAction" | "scheduleState">): boolean {
  if (task.scheduleState === "done") return true;
  if (!task.statusAction) return false;
  return TERMINAL_STATUS_ACTIONS.has(task.statusAction);
}

export function isTaskLocked(task: Pick<TaskResponse, "isLocked" | "lockStatus">): boolean {
  if (task.isLocked) return true;
  if (task.lockStatus && task.lockStatus !== "UNLOCKED") return true;
  return false;
}

export function toLocalDateValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toLocalTimeValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function combineLocalDateTimeToIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }
  const composed = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(composed.getTime())) return null;
  return composed.toISOString();
}

export function resolveReminderAt(
  dueIso: string,
  preset: ReminderPresetId,
  customDate: string,
  customTime: string,
): string | null {
  if (preset === "CUSTOM") {
    return combineLocalDateTimeToIso(customDate, customTime);
  }
  const presetEntry = REMINDER_PRESETS.find((entry) => entry.id === preset);
  if (!presetEntry || presetEntry.minutes === null) return null;
  const due = new Date(dueIso);
  if (Number.isNaN(due.getTime())) return null;
  return new Date(due.getTime() - presetEntry.minutes * 60_000).toISOString();
}

export type TaskScheduleDraft = {
  date: string;
  time: string;
  reminderEnabled: boolean;
  reminderPreset: ReminderPresetId;
  reminderDate: string;
  reminderTime: string;
};

export type TaskScheduleValidation = {
  ok: boolean;
  errors: {
    date?: string;
    time?: string;
    reminder?: string;
  };
};

export function validateTaskScheduleDraft(
  draft: TaskScheduleDraft,
  now: Date,
): TaskScheduleValidation {
  const errors: TaskScheduleValidation["errors"] = {};

  if (!draft.date) {
    errors.date = "Pick a deadline date.";
  } else if (!draft.time) {
    errors.time = "Pick a deadline time.";
  } else {
    const combined = combineLocalDateTimeToIso(draft.date, draft.time);
    if (!combined) {
      errors.date = "Invalid deadline.";
    } else if (new Date(combined).getTime() <= now.getTime()) {
      errors.date = "Deadline must be in the future.";
    }
  }

  if (draft.reminderEnabled && !errors.date && !errors.time) {
    const dueIso = combineLocalDateTimeToIso(draft.date, draft.time);
    if (!dueIso) {
      errors.reminder = "Pick a valid reminder time.";
    } else if (draft.reminderPreset === "CUSTOM") {
      if (!draft.reminderDate || !draft.reminderTime) {
        errors.reminder = "Pick a custom reminder date and time.";
      } else {
        const reminderIso = combineLocalDateTimeToIso(
          draft.reminderDate,
          draft.reminderTime,
        );
        if (!reminderIso) {
          errors.reminder = "Invalid reminder time.";
        } else if (new Date(reminderIso).getTime() <= now.getTime()) {
          errors.reminder = "Reminder must be in the future.";
        } else if (
          new Date(reminderIso).getTime() >=
          new Date(dueIso).getTime()
        ) {
          errors.reminder = "Reminder must be before the deadline.";
        }
      }
    } else {
      const presetEntry = REMINDER_PRESETS.find((entry) => entry.id === draft.reminderPreset);
      if (!presetEntry || presetEntry.minutes === null) {
        errors.reminder = "Pick a reminder preset.";
      } else {
        const reminderIso = new Date(
          new Date(dueIso).getTime() - presetEntry.minutes * 60_000,
        ).toISOString();
        if (new Date(reminderIso).getTime() <= now.getTime()) {
          errors.reminder = "Reminder must be in the future.";
        }
      }
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}

export type TaskSchedulePresentation = {
  label: string;
  helper?: string;
  tone: "muted" | "neutral" | "warning" | "destructive" | "success";
  icon: "calendar" | "clock" | "lock" | "check" | "none";
};

export function getTaskSchedulePresentation(
  task: TaskResponse,
  now: Date,
): TaskSchedulePresentation {
  if (task.scheduleState === "overdue_locked" || task.lockStatus === "OVERDUE_LOCKED") {
    return {
      label: "Overdue · Locked",
      helper: task.lockReason ?? undefined,
      tone: "destructive",
      icon: "lock",
    };
  }
  if (task.scheduleState === "done" || isTerminalTask(task)) {
    return {
      label: task.dueDate
        ? `Done · ${formatLocalDate(task.dueDate)}`
        : "Done",
      tone: "success",
      icon: "check",
    };
  }
  if (task.scheduleState === "due_soon") {
    const relative = formatRelativeFromIso(task.dueDate, now);
    return {
      label: relative ? `Due soon · ${relative}` : "Due soon",
      helper: task.reminderAt ? formatLocalDateTime(task.reminderAt) : undefined,
      tone: "warning",
      icon: "clock",
    };
  }
  if (task.scheduleState === "scheduled" && task.dueDate) {
    return {
      label: formatLocalDateTime(task.dueDate),
      helper: task.reminderAt ? `Reminder ${formatLocalDateTime(task.reminderAt)}` : undefined,
      tone: "neutral",
      icon: "calendar",
    };
  }
  return {
    label: "No deadline",
    tone: "muted",
    icon: "none",
  };
}

export function formatLocalDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatLocalDateTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  const tzOffset = -parsed.getTimezoneOffset();
  const sign = tzOffset >= 0 ? "+" : "-";
  const abs = Math.abs(tzOffset);
  const tzHours = String(Math.floor(abs / 60)).padStart(2, "0");
  const tzMinutes = String(abs % 60).padStart(2, "0");
  const datePart = parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const timePart = parsed.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${datePart}, ${timePart} (UTC${sign}${tzHours}:${tzMinutes})`;
}

export function formatRelativeFromIso(iso: string | null, now: Date): string | null {
  if (!iso) return null;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return null;
  const diffMs = due.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, "day");
}

export type ResolvedScheduleState = {
  state: TaskScheduleState;
  dueDate: string | null;
  reminderAt: string | null;
  lockStatus: TaskLockStatus;
  isLocked: boolean;
  isOverdue: boolean;
};

export function resolveScheduleState(task: TaskResponse, now: Date): ResolvedScheduleState {
  const state = task.scheduleState ?? deriveFallbackState(task, now);
  return {
    state,
    dueDate: task.dueDate ?? null,
    reminderAt: task.reminderAt ?? null,
    lockStatus: task.lockStatus ?? "UNLOCKED",
    isLocked: task.isLocked ?? isTaskLocked(task),
    isOverdue: task.isOverdue ?? deriveIsOverdue(task, now),
  };
}

function deriveFallbackState(task: TaskResponse, now: Date): TaskScheduleState {
  if (isTerminalTask(task)) return "done";
  if (!task.dueDate) return "none";
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return "none";
  if (due.getTime() < now.getTime()) return "overdue_locked";
  if (task.reminderAt) {
    const reminder = new Date(task.reminderAt);
    if (!Number.isNaN(reminder.getTime()) && reminder.getTime() <= now.getTime()) {
      return "due_soon";
    }
  }
  return "scheduled";
}

function deriveIsOverdue(task: TaskResponse, now: Date): boolean {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  return !Number.isNaN(due.getTime()) && due.getTime() < now.getTime();
}