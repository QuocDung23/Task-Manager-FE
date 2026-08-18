import { useEffect, useMemo, useState } from "react";
import { Check, ListChecks, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBoardMembers } from "@/features/boards/hooks/useBoardMembers";
import AssigneeMemberRow from "./assignee-member-row";

type TaskAssigneePickerProps = {
  boardId: string | null;
  /** Already-assigned user IDs on the task; rendered as checked + disabled. */
  currentAssignIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called with the merged, deduped list of user IDs the parent should PATCH.
   * Parent is responsible for the actual API call and cache update.
   */
  onConfirm: (nextUserIds: string[]) => void;
  isSubmitting?: boolean;
};

/**
 * Modal picker for choosing which board members to assign to a task.
 *
 * Behavior:
 * - Loads active board members via `useBoardMembers`. Each member is shown
 *   with a checkbox + avatar + name.
 * - Already-assigned members are checked and disabled (label "Assigned").
 * - Toggling a member stages it into a local `pendingIds` set.
 * - Confirming merges pending IDs with `currentAssignIds`, dedupes, and
 *   hands the final list back via `onConfirm`. The parent triggers PATCH.
 *
 * Staged selection is reset every time the dialog closes (overlay, Esc,
 * Cancel) via a remount-keyed body.
 */
export function TaskAssigneePicker({
  boardId,
  currentAssignIds,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: TaskAssigneePickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={String(open)}
        showCloseButton={false}
        className="sm:max-w-md"
      >
        {open ? (
          <PickerBody
            boardId={boardId}
            currentAssignIds={currentAssignIds}
            onOpenChange={onOpenChange}
            onConfirm={onConfirm}
            isSubmitting={isSubmitting}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type PickerBodyProps = Omit<TaskAssigneePickerProps, "open"> & {
  isSubmitting: boolean;
};

function PickerBody({
  boardId,
  currentAssignIds,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: PickerBodyProps) {
  const { data: members = [], isLoading } = useBoardMembers(boardId);

  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

  const currentSet = useMemo(
    () => new Set(currentAssignIds),
    [currentAssignIds],
  );

  useEffect(() => {
    setPendingIds((current) => {
      const next = new Set(current);
      let changed = false;
      for (const id of next) {
        if (currentSet.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [currentSet]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aAssigned = currentSet.has(a.id);
      const bAssigned = currentSet.has(b.id);
      if (aAssigned !== bAssigned) return aAssigned ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [members, currentSet]);

  useEffect(() => {
    return () => {
      setPendingIds(new Set());
    };
  }, []);

  const togglePending = (userId: string) => {
    setPendingIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (pendingIds.size === 0) {
      onOpenChange(false);
      return;
    }
    const nextUserIds = Array.from(
      new Set([...currentAssignIds, ...pendingIds]),
    );
    onConfirm(nextUserIds);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <>
      <DialogHeader className="flex-row items-start gap-3 space-y-0 text-left">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
          <ListChecks
            className="size-4"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <DialogTitle>Add assignees</DialogTitle>
          <DialogDescription className="max-w-[34ch]">
            Pick active board members. Already-assigned members are marked.
          </DialogDescription>
        </div>
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            disabled={isSubmitting}
            className="text-muted-foreground"
          >
            <X />
          </Button>
        </DialogClose>
      </DialogHeader>

      <div className="max-h-72 overflow-y-auto rounded-md border border-border">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-3 text-[12px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
            Loading members…
          </div>
        ) : sortedMembers.length === 0 ? (
          <div className="p-3 text-[12px] text-muted-foreground">
            No active members in this board.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {sortedMembers.map((member) => (
              <AssigneeMemberRow
                key={member.id}
                member={member}
                isAssigned={currentSet.has(member.id)}
                isSelected={pendingIds.has(member.id)}
                disabled={isSubmitting}
                onToggle={() => togglePending(member.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[11.5px] text-muted-foreground">
          {pendingIds.size > 0
            ? `${pendingIds.size} selected`
            : "Select members to add"}
        </span>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <Button
            variant="ghost"
            disabled={isSubmitting}
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            disabled={isSubmitting || pendingIds.size === 0}
            onClick={handleConfirm}
            aria-live="polite"
          >
            {isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
            ) : pendingIds.size > 0 ? (
              <Check className="size-3.5" strokeWidth={2.25} />
            ) : null}
            {isSubmitting
              ? "Adding"
              : pendingIds.size > 0
                ? `Add ${pendingIds.size}`
                : "Add"}
          </Button>
        </div>
      </div>
    </>
  );
}
