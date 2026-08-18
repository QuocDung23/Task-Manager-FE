"use client";
import { MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { stopDropdownTriggerPropagation } from "@/lib/dropdown-trigger";
import { useTaskDetail } from "./use-task-detail";
import { useBoardMembers } from "@/features/boards/hooks/useBoardMembers";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { TaskResponse } from "@/features/tasks/types";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { AssigneeAvatarGroup } from "./assignee-avatar-group";
import { TaskScheduleBadge } from "./schedule/task-schedule-badge";
import { TaskTagBadge } from "../tags/task-tag-badge";
import { TaskStatusActionPicker } from "./task-status-action-picker";

type TaskCardProps = {
  task: TaskResponse;
  listId: string;
  dragHandleAttributes?: DraggableAttributes;
  dragHandleListeners?: SyntheticListenerMap;
  isDragging?: boolean;
  disabled?: boolean;
};

export function TaskCard({
  task,
  listId,
  dragHandleAttributes,
  dragHandleListeners,
  isDragging,
  disabled,
}: TaskCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { openTask, boardId } = useTaskDetail();
  const { data: members = [] } = useBoardMembers(boardId, {
    enabled: !isDragging,
  });

  const assignees = useMemo(() => {
    const byId = new Map(members.map((m) => [m.id, m]));
    return (task.assign ?? [])
      .map((id) => byId.get(id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
  }, [members, task.assign]);

  const assignCount = task.assign?.length ?? 0;

  return (
    <>
      <div
        className="group/task relative flex cursor-grab touch-none items-start gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-left text-foreground outline-none transition-colors hover:border-foreground/20 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring/40"
        style={{
          borderColor: isDragging ? "var(--ring)" : undefined,
        }}
        onClick={(e) => {
          if ((e as React.MouseEvent).detail === 0) return;
          if (!disabled) openTask(task);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) openTask(task);
          }
        }}
        {...dragHandleAttributes}
        {...dragHandleListeners}
      >
        <div
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <TaskStatusActionPicker task={task} compact={true} />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="line-clamp-2 min-w-0 text-[13px] leading-snug text-foreground">
            {task.name}
          </p>
          <TaskScheduleBadge task={task} />
          {(task.tags && task.tags.length > 0) && (
            <TaskTagBadge tags={task.tags} />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {assignCount > 0 ? (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <AssigneeAvatarGroup
                users={assignees}
                totalCount={assignCount}
                max={3}
                size="sm"
              />
            </div>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Task actions"
                disabled={isDragging}
                className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground/70 opacity-0 outline-none transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/40 group-hover/task:opacity-100 data-[state=open]:opacity-100 data-[state=open]:bg-muted data-[state=open]:text-foreground disabled:pointer-events-none"
                {...stopDropdownTriggerPropagation}
              >
                <MoreHorizontal className="size-3.5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="w-40">
              <DropdownMenuItem
                onClick={() => openTask(task)}
                className="cursor-pointer"
              >
                Open detail
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                className="cursor-pointer"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DeleteTaskDialog
        task={task}
        listId={listId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
