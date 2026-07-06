"use client";
import { MoreVertical, AlignLeft, Trash2, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { TaskResponse } from "@/features/tasks/types";
import { useState } from "react";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { useTaskDetail } from "./task-detail-context";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

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
  const { openTask } = useTaskDetail();

  return (
    <>
      <article
        className="group/task cursor-grab touch-none rounded-xl border border-border/80 bg-background/95 p-3 transition-[border-color,background-color] duration-150 hover:border-border hover:bg-background active:cursor-grabbing dark:border-border/60"
        style={{
          borderColor: isDragging ? "var(--ring)" : undefined,
        }}
        onClick={(e) => {
          // Ignore clicks that originated from a drag gesture.
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
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-primary"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          ></div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <AlignLeft className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
                  {task.name}
                </h4>
                {task.description ? (
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {task.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 opacity-0 transition-opacity duration-150 group-hover/task:opacity-100 focus:opacity-100"
                disabled={isDragging}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Task actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => openTask(task)}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <span>Open detail</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </article>

      <DeleteTaskDialog
        task={task}
        listId={listId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
