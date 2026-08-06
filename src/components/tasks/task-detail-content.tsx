import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUpdateTask } from "@/features/tasks/hooks/useUpdateTask";
import { useTaskDetail } from "./use-task-detail";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { TaskDetailMainPanel } from "./task-detail/task-detail-main-panel";
import { TaskDetailCommentsPanel } from "./task-detail/task-detail-comments-panel";
import type { TaskResponse } from "@/features/tasks/types";
import { TaskDetailHeader } from "./task-detail/task-detail-header";

type TaskDetailContentProps = {
  task: TaskResponse;
  isOpen: boolean;
  closeTask: () => void;
  listTitle?: string;
  boardTitle?: string;
};

export default function TaskDetailContent({
  task,
  isOpen,
  closeTask,
  listTitle,
  boardTitle,
}: TaskDetailContentProps) {
  const listId = task.listId ?? "";
  const { mutate: updateTask, isPending: isUpdating } = useUpdateTask(listId);
  const { updateSelectedTask } = useTaskDetail();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleSaveName = (name: string) => {
    updateTask(
      { taskId: task.id, data: { name } },
      {
        onSuccess: (res) => {
          updateSelectedTask(res.data);
        },
      },
    );
  };

  const handleSaveDescription = (description: string | undefined) => {
    updateTask(
      { taskId: task.id, data: { description } },
      {
        onSuccess: (res) => {
          updateSelectedTask(res.data);
        },
      },
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeTask()}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[min(780px,calc(100dvh-1.25rem))] max-h-[calc(100dvh-1.25rem)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden bg-background p-0 shadow-[0_28px_90px_oklch(0.12_0.02_250/0.2)] sm:max-w-260"
        >
          <DialogTitle className="sr-only">{task.name}</DialogTitle>

          <TaskDetailHeader
            task={task}
            listTitle={listTitle}
            boardTitle={boardTitle}
            isUpdating={isUpdating}
            onSaveName={handleSaveName}
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
            <TaskDetailMainPanel
              task={task}
              isUpdating={isUpdating}
              onSaveDescription={handleSaveDescription}
              onTaskUpdated={updateSelectedTask}
            />

            <TaskDetailCommentsPanel taskId={task.id} />
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-foreground/8 bg-card/50 px-5 py-3 sm:px-6">
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 strokeWidth={1.5} />
              Delete task
            </Button>
          </footer>
        </DialogContent>
      </Dialog>

      <DeleteTaskDialog
        task={task}
        listId={task.listId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={closeTask}
      />
    </>
  );
}
