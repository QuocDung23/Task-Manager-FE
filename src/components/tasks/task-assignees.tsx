import { useMemo, useState } from "react";
import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssignTask } from "@/features/tasks/hooks/useAssignTask";
import { useUnassignTask } from "@/features/tasks/hooks/useUnassignTask";
import { useBoardMembers } from "@/features/boards/hooks/useBoardMembers";
import { useTaskDetail } from "./task-detail-context";
import { TaskAssigneePicker } from "./task-assignee-picker";
import type { TaskResponse } from "@/features/tasks/types";
import AssigneeChip from "./task-assignee-chip";

type TaskAssigneesProps = {
  task: TaskResponse;
  onTaskUpdated?: (task: TaskResponse) => void;
};

/**
 * Renders the assignee chips for a single task, plus a trigger that opens
 * `<TaskAssigneePicker>` as a modal. Removing a chip calls DELETE directly;
 * adding new assignees is delegated to the picker, which PATCHes the merged
 * list back via `useAssignTask`.
 *
 * Members are resolved through `useBoardMembers`, shared with the picker via
 * React Query so opening it costs no extra network round trip.
 */
export function TaskAssignees({ task, onTaskUpdated }: TaskAssigneesProps) {
  const { boardId } = useTaskDetail();
  const { data: members = [], isLoading: isLoadingMembers } =
    useBoardMembers(boardId);

  const [pickerOpen, setPickerOpen] = useState(false);

  const currentAssignIds = useMemo(() => task.assign ?? [], [task.assign]);

  const { mutate: assignTask, isPending: isAssigning } = useAssignTask();
  const { mutate: unassignTask, isPending: isUnassigning } = useUnassignTask();

  const isMutating = isAssigning || isUnassigning;

  const handlePickerConfirm = (nextUserIds: string[]) => {
    assignTask(
      { taskId: task.id, listId: task.listId, userIds: nextUserIds },
      {
        onSuccess: (res) => {
          onTaskUpdated?.(res.data);
          setPickerOpen(false);
        },
      },
    );
  };

  const handleRemove = (userId: string) => {
    unassignTask(
      { taskId: task.id, listId: task.listId, userId },
      {
        onSuccess: (res) => {
          onTaskUpdated?.(res.data);
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 dark:text-zinc-500">
          <Users className="h-3.5 w-3.5" />
          <span>Assignees</span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setPickerOpen(true)}
          disabled={isMutating}
          className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
          aria-label="Add assignees"
        >
          <UserPlus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {currentAssignIds.length === 0 ? (
        <div className="inline-flex items-center gap-2 text-sm font-semibold italic text-zinc-300 dark:text-zinc-600">
          <span className="flex size-7 items-center justify-center rounded-full border border-dashed border-zinc-300 dark:border-zinc-700">
            <Users className="h-3.5 w-3.5" />
          </span>
          No assignees
        </div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {currentAssignIds.map((userId) => {
            const member = members.find((m) => m.id === userId);
            return (
              <li key={userId}>
                {isLoadingMembers && !member ? (
                  <Skeleton className="h-8 w-32 rounded-full" />
                ) : (
                  <AssigneeChip
                    userId={userId}
                    member={member}
                    onRemove={handleRemove}
                    disabled={isMutating}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <TaskAssigneePicker
        boardId={boardId}
        currentAssignIds={currentAssignIds}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onConfirm={handlePickerConfirm}
        isSubmitting={isAssigning}
      />
    </div>
  );
}

