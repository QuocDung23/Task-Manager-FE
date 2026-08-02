import {
  Clipboard,
  DotsThree,
  PencilSimple,
  Plus,
  Stack,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TaskCard } from "@/components/tasks/task-card";
import { useTasks } from "@/features/tasks/hooks/useTasks";
import type { ListResponse } from "@/features/lists/types";
import type { TaskResponse } from "@/features/tasks/types";
import { stopDropdownTriggerPropagation } from "@/lib/dropdown-trigger";
import { UpdateListDialog } from "./update-list-dialog";
import { DeleteListDialog } from "./delete-list-dialog";

interface ListColumnProps {
  list: ListResponse;
  boardId: string;
  dragHandleListeners?: Record<string, unknown>;
  isDragging?: boolean;
  disabled?: boolean;
  tasks?: TaskResponse[];
  isLoadingTasks?: boolean;
  isErrorTasks?: boolean;
  renderTask?: (task: TaskResponse) => ReactNode;
  listDropId?: string;
  taskSortableItems?: string[];
  isTaskDragOver?: boolean;
}

export function ListColumn({
  list,
  boardId,
  dragHandleListeners,
  isDragging,
  disabled,
  tasks: externalTasks,
  isLoadingTasks: externalLoading,
  isErrorTasks: externalError,
  renderTask: externalRenderTask,
  listDropId,
  taskSortableItems,
  isTaskDragOver,
}: ListColumnProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const shouldUseExternal = Array.isArray(externalTasks);
  const { data, isLoading, isError } = useTasks(list.id, {
    enabled: !shouldUseExternal,
  });

  const isLoadingTasks = shouldUseExternal
    ? externalLoading ?? false
    : isLoading;
  const isErrorTasks = shouldUseExternal ? externalError ?? false : isError;
  const tasks = shouldUseExternal ? externalTasks : (data?.data ?? []);

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: listDropId ?? `list:${list.id}`,
    data: { type: "task-list", listId: list.id },
    disabled: !listDropId,
  });

  const showDropIndicator = (isOver || isTaskDragOver) && tasks.length === 0;
  const isHighlighted = Boolean(isDragging || isTaskDragOver);

  return (
    <>
      <div
        className="group/list relative flex h-[min(100%,42rem)] w-72 min-w-72 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/85 text-card-foreground shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)] ring-1 ring-inset ring-foreground/2 transition-[border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform hover:border-border hover:shadow-[0_1px_0_rgba(15,23,42,0.04),0_32px_64px_-32px_rgba(15,23,42,0.22)] dark:border-border/50 dark:shadow-[0_1px_0_rgba(0,0,0,0.4),0_24px_48px_-32px_rgba(0,0,0,0.55)] dark:ring-foreground/4"
        style={{
          borderColor: isHighlighted ? "var(--ring)" : undefined,
        }}
      >
        <div
          className="flex items-center justify-between gap-3 px-4 pt-4 pb-3"
          {...dragHandleListeners}
        >
          <div className="flex min-w-0 flex-1 cursor-grab items-center gap-2.5 active:cursor-grabbing">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary/70 text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/list:bg-secondary">
              <Clipboard className="h-3.5 w-3.5" weight="duotone" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[13.5px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
                {list.name}
              </h3>
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground/85">
                <span className="tabular-nums">{tasks.length}</span>{" "}
                {tasks.length === 1 ? "task" : "tasks"}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover/list:opacity-100 focus:opacity-100"
                {...stopDropdownTriggerPropagation}
              >
                <DotsThree className="h-4 w-4" weight="bold" />
                <span className="sr-only">List actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => setEditOpen(true)}
                disabled={disabled}
                className="gap-2"
              >
                <PencilSimple className="h-4 w-4 text-muted-foreground" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={disabled}
                className="gap-2"
              >
                <Trash className="h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-t border-border/70 bg-secondary/15">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
            {isLoadingTasks ? (
              <div className="space-y-3">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            ) : null}

            {isErrorTasks ? (
              <div className="flex min-h-45 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/30 bg-background/80 px-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <WarningCircle className="h-5 w-5" weight="fill" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Unable to load tasks
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Try again in a moment or refresh the board.
                  </p>
                </div>
              </div>
            ) : null}

            {!isLoadingTasks && !isErrorTasks && tasks.length > 0 ? (
              <div className="space-y-3">
                {externalRenderTask && taskSortableItems ? (
                  <SortableContext
                    items={taskSortableItems}
                    strategy={verticalListSortingStrategy}
                  >
                    {tasks.map((task) => externalRenderTask(task))}
                  </SortableContext>
                ) : externalRenderTask ? (
                  tasks.map((task) => externalRenderTask(task))
                ) : (
                  tasks.map((task) => (
                    <TaskCard key={task.id} task={task} listId={list.id} />
                  ))
                )}
              </div>
            ) : null}

            {!isLoadingTasks && !isErrorTasks && tasks.length === 0 ? (
              <div
                ref={setDroppableRef}
                className={`flex min-h-45 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-background/80 px-4 text-center transition-[background-color,border-color] duration-200 ${
                  showDropIndicator
                    ? "border-primary bg-primary/5"
                    : "border-border/80"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground/70">
                  <Stack className="h-5 w-5" weight="duotone" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    No tasks yet
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Add the first task to start filling this list.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-border/70 bg-card/70 px-3 py-3">
            <CreateTaskDialog
              listId={list.id}
              trigger={
                <button
                  type="button"
                  className="group inline-flex h-9 w-full items-center justify-center gap-2 rounded-full border border-dashed border-border/70 bg-background/40 px-3 text-[12.5px] font-medium text-muted-foreground outline-none transition-[border-color,background-color,color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:bg-background hover:text-foreground focus-visible:border-accent/40 focus-visible:ring-4 focus-visible:ring-accent/15"
                >
                  <span className="grid size-5 place-items-center rounded-full bg-secondary text-muted-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105">
                    <Plus className="size-3" weight="bold" />
                  </span>
                  <span>Add task</span>
                </button>
              }
            />
          </div>
        </div>
      </div>

      <UpdateListDialog
        list={list}
        boardId={boardId}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteListDialog
        list={list}
        boardId={boardId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
