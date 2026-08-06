import { useMemo, useState } from "react";
import { UserPlus, Users } from "lucide-react";
import { useAssignTask } from "@/features/tasks/hooks/useAssignTask";
import { useUnassignTask } from "@/features/tasks/hooks/useUnassignTask";
import { useBoardMembers } from "@/features/boards/hooks/useBoardMembers";
import { useTaskDetail } from "./use-task-detail";
import { TaskAssigneePicker } from "./task-assignee-picker";
import type { TaskResponse } from "@/features/tasks/types";
import AssigneeChip from "./task-assignee-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type TaskAssigneesProps = {
  task: TaskResponse;
  onTaskUpdated?: (task: TaskResponse) => void;
};

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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Users className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
          <span>Assignees</span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setPickerOpen(true)}
          disabled={isMutating}
          aria-label="Add assignees"
          className="text-muted-foreground"
        >
          <UserPlus className="size-3.5" strokeWidth={1.75} />
        </Button>
      </div>

      {currentAssignIds.length === 0 ? (
        <div className="inline-flex items-center gap-2 rounded-md border border-dashed border-border bg-card/40 px-2.5 py-1 text-[12px] text-muted-foreground">
          <Users className="size-3" strokeWidth={1.75} aria-hidden="true" />
          No assignees yet
        </div>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {currentAssignIds.map((userId) => {
            const member = members.find((m) => m.id === userId);
            return (
              <li key={userId}>
                {isLoadingMembers && !member ? (
                  <Skeleton className="h-7 w-32 rounded-full" />
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
