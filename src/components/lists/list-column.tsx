import {
  Clipboard,
  DotsThree,
  PencilSimple,
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

  // Droppable zone for empty list or cross-list drop
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: listDropId ?? `list:${list.id}`,
    data: { type: "task-list", listId: list.id },
    disabled: !listDropId,
  });

  const showDropIndicator = (isOver || isTaskDragOver) && tasks.length === 0;

  return (
    <>
      <div
        className="group/list relative flex h-[min(100%,42rem)] w-72 min-w-72 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition-[border-color] duration-200 will-change-transform dark:border-border/50"
        style={{
          borderColor: isDragging || isTaskDragOver ? "var(--ring)" : undefined,
        }}
      >
        <div
          className="flex items-center justify-between gap-3 px-4 pt-4"
          {...dragHandleListeners}
        >
          <div className="flex min-w-0 flex-1 cursor-grab items-center gap-2.5 active:cursor-grabbing">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground transition-colors group-hover/list:bg-accent">
              <Clipboard className="h-3.5 w-3.5" weight="duotone" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold leading-tight text-foreground">
                {list.name}
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 opacity-0 transition-opacity duration-150 group-hover/list:opacity-100 focus:opacity-100"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <DotsThree
                  className="h-4 w-4 text-muted-foreground"
                  weight="bold"
                />
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

        {list.description ? (
          <div className="px-4 pb-3 pt-1">
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {list.description}
            </p>
          </div>
        ) : null}

        <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-border bg-secondary/20">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
            {isLoadingTasks ? (
              <div className="space-y-3">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            ) : null}

            {isErrorTasks ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/30 bg-background/80 px-4 text-center">
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
                className={`flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-background/80 px-4 text-center transition-[background-color,border-color] duration-200 ${
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

          <div className="border-t border-border/70 bg-card/70 px-4 py-3">
            <CreateTaskDialog listId={list.id} />
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
