import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteList } from "@/features/lists/hooks/useDeleteList";
import type { ListResponse } from "@/features/lists/types";
import { Trash2 } from "lucide-react";

interface DeleteListDialogProps {
  list: ListResponse;
  boardId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteListDialog({
  list,
  boardId,
  open,
  onOpenChange,
}: DeleteListDialogProps) {
  const { mutate: deleteList, isPending } = useDeleteList(boardId);

  const handleConfirm = () => {
    deleteList(list.id, {
      onSuccess: () => {
        onOpenChange?.(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-500" />
            Delete list
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <strong>&quot;{list.name}&quot;</strong>? This action cannot be
            undone and all cards in this list will be permanently removed.
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
            {isPending ? "Deleting..." : "Delete List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
