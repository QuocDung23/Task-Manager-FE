import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Tag,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useClearTaskSchedule,
  useSetTaskSchedule,
} from "@/features/tasks/hooks/useTaskSchedule";
import type {
  TaskResponse,
  TaskStatusAction,
} from "@/features/tasks/types";
import {
  STATUS_ACTION_LABEL,
  STATUS_ACTION_TONE,
  getStatusActionMeta,
  type StatusActionTone,
} from "./task-detail-status";
import { useAssignTask } from "@/features/tasks/hooks/useAssignTask";
import { useUnassignTask } from "@/features/tasks/hooks/useUnassignTask";
import { useBoardMembers } from "@/features/boards/hooks/useBoardMembers";
import { UserAvatar } from "@/components/users/user-avatar";
import { useTaskDetail } from "../use-task-detail";

type TaskDetailMetaBarProps = {
  task: TaskResponse;
  isUpdating: boolean;
  onTaskUpdated: (task: TaskResponse) => void;
};

export function TaskDetailMetaBar({
  task,
  isUpdating,
  onTaskUpdated,
}: TaskDetailMetaBarProps) {
  return (
    <div
      aria-label="Task details"
      className="grid grid-cols-2 gap-2 px-5 pb-4 pt-4 sm:grid-cols-4 sm:px-6"
    >
      <LabelChip />
      <ScheduleChip
        task={task}
        isUpdating={isUpdating}
        onTaskUpdated={onTaskUpdated}
      />
      <AssignChip task={task} onTaskUpdated={onTaskUpdated} />
      <StatusActionChip
        task={task}
        isUpdating={isUpdating}
        onTaskUpdated={onTaskUpdated}
      />
    </div>
  );
}

function LabelChip() {
  return (
    <button
      type="button"
      disabled
      aria-label="Labels (coming soon)"
      className="group flex h-15.5 min-w-0 cursor-not-allowed items-center gap-2.5 rounded-lg bg-background/40 px-3 text-left opacity-70 ring-1 ring-foreground/7"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <Tag className="size-4" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10.5px] leading-4 text-muted-foreground">
          Labels
        </span>
        <span className="block truncate text-[12.5px] font-medium leading-5 text-muted-foreground">
          Empty
        </span>
      </span>
    </button>
  );
}

type ScheduleChipProps = {
  task: TaskResponse;
  isUpdating: boolean;
  onTaskUpdated: (task: TaskResponse) => void;
};

function ScheduleChip({ task, isUpdating, onTaskUpdated }: ScheduleChipProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(toDateInputValue(task.dueDate));
  const [reason, setReason] = useState("");
  const overdue = task.isOverdue ?? isBeforeToday(task.dueDate);
  const requiresReason = Boolean(
    task.isLocked || (task.lockStatus && task.lockStatus !== "UNLOCKED"),
  );
  const clearBlocked = task.lockStatus === "OVERDUE_LOCKED";

  const { mutate: setTaskSchedule, isPending: isSetting } =
    useSetTaskSchedule();
  const { mutate: clearTaskSchedule, isPending: isClearing } =
    useClearTaskSchedule();

  const scheduleBusy = isUpdating || isSetting || isClearing;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh the date buffer after a successful mutation
    setValue(toDateInputValue(task.dueDate));
  }, [task.dueDate]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setValue(toDateInputValue(task.dueDate));
      setReason("");
    }
    setOpen(nextOpen);
  };

  const save = () => {
    if (scheduleBusy) return;
    const currentValue = toDateInputValue(task.dueDate);
    if (!value || value === currentValue) {
      setOpen(false);
      return;
    }
    if (requiresReason && reason.trim().length === 0) return;

    if (task.dueDate) {
      setTaskSchedule(
        {
          taskId: task.id,
          data: {
            dueDate: toEndOfDayIso(value),
            reason: reason.trim() || undefined,
          },
          isReschedule: true,
        },
        {
          onSuccess: (response) => {
            onTaskUpdated(response.data);
            setOpen(false);
          },
        },
      );
    } else {
      setTaskSchedule(
        {
          taskId: task.id,
          data: {
            dueDate: toEndOfDayIso(value),
            reason: reason.trim() || undefined,
          },
        },
        {
          onSuccess: (response) => {
            onTaskUpdated(response.data);
            setOpen(false);
          },
        },
      );
    }
  };

  const clear = () => {
    if (scheduleBusy || !task.dueDate || clearBlocked) return;
    clearTaskSchedule(
      { taskId: task.id },
      {
        onSuccess: (response) => {
          onTaskUpdated(response.data);
          setOpen(false);
        },
      },
    );
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex h-15.5 min-w-0 items-center gap-2.5 rounded-lg bg-background/80 px-3 text-left outline-none ring-1 ring-foreground/7 transition-[background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-background hover:ring-foreground/12 focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.985] data-[state=open]:bg-background data-[state=open]:ring-foreground/15"
          aria-label={`Edit schedule. ${task.dueDate ? formatDate(task.dueDate) : "Not set"}`}
        >
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-md ${
              overdue
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {overdue ? (
              <Clock className="size-4" strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <CalendarDays
                className="size-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10.5px] leading-4 text-muted-foreground">
              Schedule
            </span>
            <span
              className={`block truncate text-[12.5px] font-medium leading-5 tabular-nums ${
                overdue
                  ? "text-destructive"
                  : task.dueDate
                    ? "text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {task.dueDate ? formatDate(task.dueDate) : "Not set"}
            </span>
          </span>
          <ChevronDown
            className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[state=open]:rotate-180"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        collisionPadding={12}
        className="w-[min(320px,calc(100vw-2rem))] overflow-hidden p-1.5"
      >
        <div className="rounded-lg bg-background p-3 ring-1 ring-foreground/7">
          <div className="mb-3">
            <h3 className="text-[13px] font-medium text-foreground">
              Schedule
            </h3>
            <p className="mt-0.5 text-[11.5px] leading-4 text-muted-foreground">
              Set the day this task should be completed.
            </p>
          </div>

          <label
            htmlFor={`task-schedule-${task.id}`}
            className="mb-1.5 block text-[11px] font-medium text-foreground/80"
          >
            Date
          </label>
          <Input
            id={`task-schedule-${task.id}`}
            type="date"
            value={value}
            min={getTodayInputValue()}
            autoFocus
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
              if (event.key === "Escape") handleOpenChange(false);
            }}
            disabled={scheduleBusy}
            className="h-9 text-[13px]"
          />

          {requiresReason ? (
            <div className="mt-3">
              <label
                htmlFor={`task-schedule-reason-${task.id}`}
                className="mb-1.5 block text-[11px] font-medium text-foreground/80"
              >
                Reschedule reason
              </label>
              <Textarea
                id={`task-schedule-reason-${task.id}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain why the schedule is changing..."
                rows={2}
                maxLength={1000}
                disabled={scheduleBusy}
                className="resize-none text-[12.5px] leading-5"
              />
            </div>
          ) : null}

          {clearBlocked ? (
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              Overdue tasks need a new date before the schedule can be cleared.
            </p>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={clear}
              disabled={scheduleBusy || !task.dueDate || clearBlocked}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={
                scheduleBusy ||
                !value ||
                value === toDateInputValue(task.dueDate) ||
                (requiresReason && reason.trim().length === 0)
              }
            >
              {scheduleBusy ? (
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
              ) : (
                <Check className="size-3.5" strokeWidth={1.75} />
              )}
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type AssignChipProps = {
  task: TaskResponse;
  onTaskUpdated: (task: TaskResponse) => void;
};

function AssignChip({ task, onTaskUpdated }: AssignChipProps) {
  const { boardId } = useTaskDetail();
  const { data: members = [], isLoading } = useBoardMembers(boardId);
  const { mutate: assignTask, isPending: isAssigning } = useAssignTask();
  const { mutate: unassignTask, isPending: isUnassigning } = useUnassignTask();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const assignedIds = useMemo(() => new Set(task.assign ?? []), [task.assign]);
  const sortedMembers = useMemo(
    () =>
      [...members].sort((left, right) => {
        const assignedDelta =
          Number(assignedIds.has(right.id)) - Number(assignedIds.has(left.id));
        return assignedDelta || left.name.localeCompare(right.name);
      }),
    [assignedIds, members],
  );
  const isMutating = isAssigning || isUnassigning;
  const isTaskLocked = Boolean(
    task.isLocked || (task.lockStatus && task.lockStatus !== "UNLOCKED"),
  );
  const count = assignedIds.size;
  const memberCountLabel =
    count === 0 ? "Unassigned" : count === 1 ? "1 member" : `${count} members`;

  const toggleMember = (userId: string) => {
    if (isMutating || isTaskLocked) return;
    setPendingUserId(userId);

    if (assignedIds.has(userId)) {
      unassignTask(
        { taskId: task.id, listId: task.listId, userId },
        {
          onSuccess: (response) => onTaskUpdated(response.data),
          onSettled: () => setPendingUserId(null),
        },
      );
      return;
    }

    assignTask(
      {
        taskId: task.id,
        listId: task.listId,
        userIds: Array.from(new Set([...(task.assign ?? []), userId])),
      },
      {
        onSuccess: (response) => onTaskUpdated(response.data),
        onSettled: () => setPendingUserId(null),
      },
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex h-15.5 min-w-0 items-center gap-2.5 rounded-lg bg-background/80 px-3 text-left outline-none ring-1 ring-foreground/7 transition-[background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-background hover:ring-foreground/12 focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.985] data-[state=open]:bg-background data-[state=open]:ring-foreground/15"
          aria-label={`Edit assignees. ${memberCountLabel}`}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <Users className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10.5px] leading-4 text-muted-foreground">
              Assign
            </span>
            <span
              className={`block truncate text-[12.5px] font-medium leading-5 ${
                count > 0 ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {memberCountLabel}
            </span>
          </span>
          <ChevronDown
            className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[state=open]:rotate-180"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        collisionPadding={12}
        className="w-[min(340px,calc(100vw-2rem))] overflow-hidden p-1.5"
      >
        <div className="overflow-hidden rounded-lg bg-background ring-1 ring-foreground/7">
          <div className="px-3 pb-2.5 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-medium text-foreground">
                  Assignees
                </h3>
                <p className="mt-0.5 text-[11.5px] leading-4 text-muted-foreground">
                  {isTaskLocked
                    ? "Reschedule this task before changing assignees."
                    : "Pick who is responsible for this task."}
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {count}/{members.length}
              </span>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto border-t border-foreground/7 p-1.5">
            {isLoading ? (
              <div className="space-y-1.5 p-1">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 p-1.5">
                    <Skeleton className="size-7 rounded-full" />
                    <Skeleton className="h-3.5 flex-1" />
                  </div>
                ))}
              </div>
            ) : sortedMembers.length === 0 ? (
              <p className="px-3 py-7 text-center text-[12px] text-muted-foreground">
                No active board members.
              </p>
            ) : (
              <ul className="space-y-1">
                {sortedMembers.map((member) => {
                  const assigned = assignedIds.has(member.id);
                  const pending = pendingUserId === member.id && isMutating;

                  return (
                    <li key={member.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={assigned}
                        onClick={() => toggleMember(member.id)}
                        disabled={isMutating || isTaskLocked}
                        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-none transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
                      >
                        <UserAvatar
                          name={member.name}
                          avatar={member.avatar}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground/85">
                          {member.name}
                        </span>
                        <span
                          className={`grid size-5 shrink-0 place-items-center rounded-md ring-1 transition-[background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                            assigned
                              ? "bg-primary text-primary-foreground ring-primary"
                              : "bg-background text-transparent ring-foreground/15"
                          }`}
                          aria-hidden="true"
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
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type StatusActionChipProps = {
  task: TaskResponse;
  isUpdating: boolean;
  onTaskUpdated: (task: TaskResponse) => void;
};

type StatusActionEntry = {
  value: TaskStatusAction;
  label: string;
  description: string;
  tone: StatusActionTone;
};

const STATUS_ACTIONS: StatusActionEntry[] = [
  { value: "TODO", label: STATUS_ACTION_LABEL.TODO, description: "Not started yet.", tone: STATUS_ACTION_TONE.TODO },
  { value: "IN_PROGRESS", label: STATUS_ACTION_LABEL.IN_PROGRESS, description: "Actively being worked on.", tone: STATUS_ACTION_TONE.IN_PROGRESS },
  { value: "IN_REVIEW", label: STATUS_ACTION_LABEL.IN_REVIEW, description: "Awaiting feedback or approval.", tone: STATUS_ACTION_TONE.IN_REVIEW },
  { value: "DONE", label: STATUS_ACTION_LABEL.DONE, description: "Work is finished.", tone: STATUS_ACTION_TONE.DONE },
  { value: "PAUSED", label: STATUS_ACTION_LABEL.PAUSED, description: "Work is temporarily halted.", tone: STATUS_ACTION_TONE.PAUSED },
  { value: "FIXED", label: STATUS_ACTION_LABEL.FIXED, description: "A reported issue has been resolved.", tone: STATUS_ACTION_TONE.FIXED },
  { value: "CANCELLED", label: STATUS_ACTION_LABEL.CANCELLED, description: "Work will not continue.", tone: STATUS_ACTION_TONE.CANCELLED },
  { value: "ARCHIVED", label: STATUS_ACTION_LABEL.ARCHIVED, description: "Hide the task from active work.", tone: STATUS_ACTION_TONE.ARCHIVED },
  { value: "RESTORED", label: STATUS_ACTION_LABEL.RESTORED, description: "Bring a task back to active state.", tone: STATUS_ACTION_TONE.RESTORED },
  { value: "CREATED", label: STATUS_ACTION_LABEL.CREATED, description: "Task was just created.", tone: STATUS_ACTION_TONE.CREATED },
  { value: "UPDATED", label: STATUS_ACTION_LABEL.UPDATED, description: "Mark a recent edit.", tone: STATUS_ACTION_TONE.UPDATED },
  { value: "DELETED", label: STATUS_ACTION_LABEL.DELETED, description: "Mark the task as removed.", tone: STATUS_ACTION_TONE.DELETED },
];

function humanizeAction(value: TaskStatusAction | undefined): string {
  return getStatusActionMeta(value).label;
}

function StatusActionChip({
  task,
  isUpdating,
  onTaskUpdated,
}: StatusActionChipProps) {
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<TaskStatusAction | null>(
    null,
  );

  const currentLabel = humanizeAction(task.statusAction);
  const currentEntry = STATUS_ACTIONS.find(
    (option) => option.value === task.statusAction,
  );
  const isBusy = isUpdating || pendingAction !== null;

  const selectAction = (next: TaskStatusAction) => {
    if (isBusy || next === task.statusAction) {
      setOpen(false);
      return;
    }
    setPendingAction(next);
    // Optimistic local update only — no backend endpoint wired up yet.
    onTaskUpdated({
      ...task,
      statusAction: next,
    });
    setPendingAction(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex h-15.5 min-w-0 items-center gap-2.5 rounded-lg bg-background/80 px-3 text-left outline-none ring-1 ring-foreground/7 transition-[background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-background hover:ring-foreground/12 focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.985] data-[state=open]:bg-background data-[state=open]:ring-foreground/15"
          aria-label={`Change status action. Currently ${currentLabel}`}
        >
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-md ${
              currentEntry ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            <Activity
              className="size-4"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10.5px] leading-4 text-muted-foreground">
              Status action
            </span>
            <span
              className={`block truncate text-[12.5px] font-medium leading-5 ${
                currentEntry ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {currentLabel}
            </span>
          </span>
          <ChevronDown
            className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[state=open]:rotate-180"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        collisionPadding={12}
        className="w-[min(260px,calc(100vw-2rem))] overflow-hidden p-1.5"
      >
        <div className="overflow-hidden rounded-lg bg-background ring-1 ring-foreground/7">
          <div className="px-3 pb-2 pt-2.5">
            <h3 className="text-[13px] font-medium text-foreground">
              Status action
            </h3>
            <p className="mt-0.5 text-[11.5px] leading-4 text-muted-foreground">
              Pick the action that best describes the current state.
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto border-t border-foreground/7 p-1.5">
            <ul className="space-y-1">
              {STATUS_ACTIONS.map((option) => {
                const selected = option.value === task.statusAction;
                const pending = pendingAction === option.value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => selectAction(option.value)}
                      disabled={isBusy}
                      className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left outline-none transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
                    >
                      <span
                        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md ring-1 transition-[background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          selected
                            ? "bg-primary text-primary-foreground ring-primary"
                            : "bg-background text-transparent ring-foreground/15"
                        }`}
                        aria-hidden="true"
                      >
                        {pending ? (
                          <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                        ) : (
                          <Check className="size-3" strokeWidth={2} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] text-foreground/85">
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-foreground/7 px-3 py-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isBusy}
            >
              Close
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function toDateInputValue(date?: string | null): string {
  return date?.split("T")[0] ?? "";
}

function toEndOfDayIso(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

function getTodayInputValue(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isBeforeToday(date?: string | null): boolean {
  const value = toDateInputValue(date);
  if (!value) return false;
  const [year, month, day] = value.split("-").map(Number);
  const due = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function formatDate(date: string): string {
  const [year, month, day] = toDateInputValue(date).split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
