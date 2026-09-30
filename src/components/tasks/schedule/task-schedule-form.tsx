import { useT } from "@/services/i18n";
import { TranslateText } from "@/services/i18n";
import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  combineLocalDateTimeToIso,
  inferPresetFromInterval,
  isTaskLocked,
  isTerminalTask,
  toLocalDateValue,
  toLocalTimeValue,
  validateTaskScheduleDraft,
  type TaskScheduleDraft,
} from "@/features/tasks/utils/task-schedule";
import {
  useClearTaskSchedule,
  useSetTaskSchedule,
} from "@/features/tasks/hooks/useTaskSchedule";
import type { ReminderPresetId, TaskResponse } from "@/features/tasks/types";
import {
  TaskScheduleDateField,
  TaskScheduleTimeField,
} from "./task-schedule-fields";
import { TaskScheduleLockAlert } from "./task-schedule-lock-alert";
import { TaskScheduleReminderMenu } from "./task-schedule-reminder-menu";

type TaskScheduleFormProps = {
  task: TaskResponse;
  onTaskUpdated: (task: TaskResponse) => void;
  onClose: () => void;
};

const LOCKED_RESCHEDULE_REASON =
  "Task rescheduled from overdue lock state via frontend fallback.";

function buildDraft(task: TaskResponse): TaskScheduleDraft {
  const startDate = toLocalDateValue(task.startDate);
  const date = toLocalDateValue(task.dueDate);
  const time = task.dueDate ? toLocalTimeValue(task.dueDate) : "09:00";
  const reminderDate = toLocalDateValue(task.reminderAt);
  const reminderTime = toLocalTimeValue(task.reminderAt);
  return {
    startDate,
    date,
    time,
    reminderEnabled: Boolean(task.reminderAt),
    reminderPreset:
      task.reminderAt && task.dueDate
        ? inferPresetFromInterval(task.dueDate, task.reminderAt)
        : "AT_TIME",
    reminderDate,
    reminderTime,
  };
}

export function TaskScheduleForm({
  task,
  onTaskUpdated,
  onClose,
}: TaskScheduleFormProps) {
  const t = useT();
  const [draft, setDraft] = useState<TaskScheduleDraft>(() => buildDraft(task));
  // FE-4: Use fresh Date.now() at validation time instead of capturing once at mount
  const validation = useMemo(
    () => validateTaskScheduleDraft(draft, new Date()),
    [draft],
  );

  const locked = isTaskLocked(task);
  const terminal = isTerminalTask(task);
  const hasExistingSchedule = Boolean(task.dueDate);
  const clearBlocked = task.lockStatus === "OVERDUE_LOCKED";

  const { mutate: setSchedule, isPending: isSetting } = useSetTaskSchedule();
  const { mutate: clearSchedule, isPending: isClearing } =
    useClearTaskSchedule();
  const isBusy = isSetting || isClearing;

  useEffect(() => {
    setDraft(buildDraft(task));
  }, [task]);

  const composedDueIso = validation.errors.date
    ? null
    : combineLocalDateTimeToIso(draft.date, draft.time);

  const composedReminderIso = useMemo(() => {
    if (!draft.reminderEnabled || !composedDueIso) return null;
    if (draft.reminderPreset === "CUSTOM") {
      return combineLocalDateTimeToIso(draft.reminderDate, draft.reminderTime);
    }
    const presetMinutes: Record<Exclude<ReminderPresetId, "CUSTOM">, number> = {
      AT_TIME: 0,
      BEFORE_15: 15,
      BEFORE_30: 30,
      BEFORE_60: 60,
      BEFORE_DAY: 60 * 24,
    };
    const minutes = presetMinutes[draft.reminderPreset];
    if (minutes === undefined) return null;
    return new Date(
      new Date(composedDueIso).getTime() - minutes * 60_000,
    ).toISOString();
  }, [draft, composedDueIso]);

  const handleSubmit = () => {
    if (!composedDueIso || !validation.ok || terminal) return;
    const intent: "set" | "reschedule" = hasExistingSchedule
      ? "reschedule"
      : "set";
    setSchedule(
      {
        taskId: task.id,
        intent,
        data: {
          startDate: draft.startDate
            ? (combineLocalDateTimeToIso(draft.startDate, "00:00") ?? undefined)
            : undefined,
          dueDate: composedDueIso,
          reminderAt: draft.reminderEnabled
            ? (composedReminderIso ?? undefined)
            : undefined,
          reason: locked ? LOCKED_RESCHEDULE_REASON : undefined,
        },
      },
      {
        onSuccess: (response) => {
          onTaskUpdated(response.data);
          onClose();
        },
      },
    );
  };

  const handleClear = () => {
    if (clearBlocked || isBusy || !hasExistingSchedule) return;
    clearSchedule(
      { taskId: task.id },
      {
        onSuccess: (response) => {
          onTaskUpdated(response.data);
          onClose();
        },
      },
    );
  };

  const updateDraft = (patch: Partial<TaskScheduleDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  return (
    <div className="rounded-lg bg-background p-3 ring-1 ring-foreground/7">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-medium text-foreground"><TranslateText id="task.schedule" /></h3>
          <p className="mt-0.5 text-[11.5px] leading-4 text-muted-foreground">
            {locked
              ? t("schedule.unlockHelp")
              : hasExistingSchedule
                ? t("schedule.updateHelp")
                : t("schedule.createHelp")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t("task.closeSchedule")}
          onClick={onClose}
          disabled={isBusy}
          className="text-muted-foreground"
        >
          <X />
        </Button>
      </div>

      {locked ? (
        <div className="mb-3">
          <TaskScheduleLockAlert
            lockReason={task.lockReason}
            lockedAt={task.lockedAt}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label
            htmlFor={`task-schedule-start-date-${task.id}`}
            className="mb-1.5 block text-[11px] font-medium text-foreground/80"
          >
            <TranslateText id="task.startDate" />
          </Label>
          <TaskScheduleDateField
            id={`task-schedule-start-date-${task.id}`}
            value={draft.startDate}
            disabled={terminal || isBusy}
            onChange={(value) => updateDraft({ startDate: value })}
          />
          <p className="mt-1 h-4 text-[11px] leading-4 text-muted-foreground">
            {validation.errors.startDate ?? t("schedule.startHint")}
          </p>
        </div>
        <div>
          <Label
            htmlFor={`task-schedule-date-${task.id}`}
            className="mb-1.5 block text-[11px] font-medium text-foreground/80"
          >
            <TranslateText id="task.dueDate" />
          </Label>
          <TaskScheduleDateField
            id={`task-schedule-date-${task.id}`}
            value={draft.date}
            min={toLocalDateValue(new Date().toISOString())}
            disabled={terminal || isBusy}
            onChange={(value) => updateDraft({ date: value })}
          />
          <p className="mt-1 h-4 text-[11px] leading-4 text-muted-foreground">
            {validation.errors.date ?? t("schedule.deadlineHint")}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div>
          <Label
            htmlFor={`task-schedule-time-${task.id}`}
            className="mb-1.5 block text-[11px] font-medium text-foreground/80"
          >
            <TranslateText id="task.dueTime" />
          </Label>
          <TaskScheduleTimeField
            id={`task-schedule-time-${task.id}`}
            value={draft.time}
            disabled={terminal || isBusy}
            onChange={(value) => updateDraft({ time: value })}
          />
          <p className="mt-1 h-4 text-[11px] leading-4 text-muted-foreground">
            {validation.errors.time ?? t("schedule.clockHint")}
          </p>
        </div>
        <div>
          <span className="mb-1.5 block text-[11px] font-medium text-foreground/80">
            <TranslateText id="task.reminder" />
          </span>
          <TaskScheduleReminderMenu
            preset={draft.reminderPreset}
            enabled={draft.reminderEnabled}
            disabled={terminal || isBusy}
            onPresetChange={(preset) => updateDraft({ reminderPreset: preset })}
            onEnabledChange={(reminderEnabled) =>
              updateDraft({ reminderEnabled })
            }
          />
          <p className="mt-1 h-4 text-[11px] leading-4 text-muted-foreground">
            {validation.errors.reminder ?? t("schedule.optionalNudges")}
          </p>
        </div>
      </div>

      {draft.reminderEnabled && draft.reminderPreset === "CUSTOM" ? (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div>
            <Label
              htmlFor={`task-schedule-reminder-date-${task.id}`}
              className="mb-1.5 block text-[11px] font-medium text-foreground/80"
            >
              <TranslateText id="task.reminderDate" />
            </Label>
            <TaskScheduleDateField
              id={`task-schedule-reminder-date-${task.id}`}
              value={draft.reminderDate}
              min={toLocalDateValue(new Date().toISOString())}
              disabled={terminal || isBusy}
              onChange={(value) => updateDraft({ reminderDate: value })}
            />
          </div>
          <div>
            <Label
              htmlFor={`task-schedule-reminder-time-${task.id}`}
              className="mb-1.5 block text-[11px] font-medium text-foreground/80"
            >
              <TranslateText id="task.reminderTime" />
            </Label>
            <TaskScheduleTimeField
              id={`task-schedule-reminder-time-${task.id}`}
              value={draft.reminderTime}
              disabled={terminal || isBusy}
              onChange={(value) => updateDraft({ reminderTime: value })}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleClear}
          disabled={isBusy || !hasExistingSchedule || clearBlocked || terminal}
          className="text-muted-foreground"
        >
          <TranslateText id="task.clearSchedule" />
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isBusy || terminal || !validation.ok || !composedDueIso}
          aria-live="polite"
        >
          {isSetting ? (
            <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
          ) : (
            <Check className="size-3.5" strokeWidth={1.75} />
          )}
          {hasExistingSchedule ? t("schedule.reschedule") : t("schedule.set")}
        </Button>
      </div>

      {clearBlocked ? (
        <p className="mt-2 text-[11.5px] leading-4 text-muted-foreground">
          <TranslateText id="task.overdueClearWarning" />
        </p>
      ) : null}
    </div>
  );
}
