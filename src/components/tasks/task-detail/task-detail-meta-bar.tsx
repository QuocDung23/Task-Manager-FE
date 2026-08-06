import { useMemo, useState } from "react";
import {
  Activity,
  ChevronDown,
  Check,
  Loader2,
  Tag,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { isTaskLocked, isTerminalTask } from "@/features/tasks/utils/task-schedule";
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
import { TaskScheduleChip } from "../schedule/task-schedule-chip";

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
      <TaskScheduleChip
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
  const isTaskLockedState = isTaskLocked(task);
  const count = assignedIds.size;
  const memberCountLabel =
    count === 0 ? "Unassigned" : count === 1 ? "1 member" : `${count} members`;

  const toggleMember = (userId: string) => {
    if (isMutating || isTaskLockedState) return;
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
                  {isTaskLockedState
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
                        disabled={isMutating || isTaskLockedState}
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

  const terminal = isTerminalTask(task);
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
          disabled={terminal}
          className="group flex h-15.5 min-w-0 items-center gap-2.5 rounded-lg bg-background/80 px-3 text-left outline-none ring-1 ring-foreground/7 transition-[background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-background hover:ring-foreground/12 focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.985] data-[state=open]:bg-background data-[state=open]:ring-foreground/15 disabled:cursor-default disabled:opacity-70"
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