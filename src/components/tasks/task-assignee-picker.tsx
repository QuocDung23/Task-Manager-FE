import { useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
 *   with a checkbox + avatar + name/email.
 * - Already-assigned members are checked and disabled (label "Assigned").
 * - Toggling a member stages it into a local `pendingIds` set.
 * - Confirming merges pending IDs with `currentAssignIds`, dedupes, and
 *   hands the final list back via `onConfirm`. The parent triggers PATCH.
 *
 * Staged selection is reset every time the dialog closes (overlay, Esc,
 * Cancel) by remounting the body via `key={open}`.
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
      {/* Remount body when `open` flips true so staged state is fresh and
          no reset effect is needed. */}
      <DialogContent key={String(open)} className="sm:max-w-md">
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

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aAssigned = currentSet.has(a.id);
      const bAssigned = currentSet.has(b.id);
      if (aAssigned !== bAssigned) return aAssigned ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [members, currentSet]);

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
      <DialogHeader>
        <DialogTitle>Add assignees</DialogTitle>
        <DialogDescription>
          Choose from active members of this board. Already-assigned members are
          marked.
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-72 overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-4 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading members...
          </div>
        ) : sortedMembers.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">
            No active members in this board.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
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

      <DialogFooter className="-mx-4 -mb-4">
        <span className="mr-auto text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
          {pendingIds.size > 0
            ? `${pendingIds.size} selected`
            : "Select members to add"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="h-8 rounded-lg text-zinc-500"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleConfirm}
          disabled={isSubmitting || pendingIds.size === 0}
          className="h-8 gap-1.5 rounded-lg"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          {pendingIds.size > 0 ? `Add ${pendingIds.size}` : "Add"}
        </Button>
      </DialogFooter>
    </>
  );
}
