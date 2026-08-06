import { ClipboardList, X } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) onOpenChange?.(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader className="flex-row items-start gap-3 space-y-0 text-left">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <ClipboardList
              className="size-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription className="max-w-[36ch]">
              <span className="font-medium text-foreground/85">
                {task.name}
              </span>{" "}
              will be removed from its list. This cannot be undone.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
              disabled={isPending}
              className="text-muted-foreground"
            >
              <X />
            </Button>
          </DialogClose>
        </DialogHeader>

        <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-[12.5px] leading-relaxed text-destructive">
          The task and its assignment history will be removed permanently.
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="ghost"
            disabled={isPending}
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            aria-live="polite"
            onClick={handleConfirm}
          >
            {isPending ? "Deleting" : "Delete task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
