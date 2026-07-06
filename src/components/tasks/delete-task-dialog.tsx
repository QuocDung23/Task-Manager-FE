import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteTask } from "@/features/tasks/hooks/useDeleteTask";
import type { TaskResponse } from "@/features/tasks/types";

type DeleteTaskDialogProps = {
  task: TaskResponse;
  listId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDeleted?: () => void;
};

export function DeleteTaskDialog({
  task,
  listId,
  open,
  onOpenChange,
  onDeleted,
}: DeleteTaskDialogProps) {
  const { mutate: deleteTask, isPending } = useDeleteTask(listId);

  const handleConfirm = () => {
    deleteTask(task.id, {
      onSuccess: () => {
        onOpenChange?.(false);
        onDeleted?.();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-500" />
            Delete task
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>&quot;{task.name}&quot;</strong>? This task will be removed from the current list.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
