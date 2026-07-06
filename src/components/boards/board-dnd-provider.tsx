"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import type { ListResponse } from "@/features/lists/types";
import type { TaskResponse } from "@/features/tasks/types";
import { ListColumn } from "@/components/lists/list-column";
import { SortableTaskCard } from "@/components/tasks/sortable-task-card";
import { TaskCard } from "@/components/tasks/task-card";
import { useTasks } from "@/features/tasks/hooks/useTasks";
import { useMoveTask } from "@/features/tasks/hooks/useMoveTask";
import { useReorderList } from "@/features/lists/hooks/useReorderList";

type ListDragData = { type: "list"; list: ListResponse };
type TaskDragData = { type: "task"; task: TaskResponse; listId: string };
type TaskListDragData = { type: "task-list"; listId: string };
type DragData = ListDragData | TaskDragData | TaskListDragData;

function getTargetListId(overId: string, overData?: DragData) {
  if (overData?.type === "task") return overData.listId;
  if (overData?.type === "task-list") return overData.listId;
  if (overId.startsWith("list:")) return overId.replace("list:", "");
  return null;
}

function normalizeTasksForList(listId: string, tasks: TaskResponse[]) {
  return tasks.map((task, index) => ({
    ...task,
    listId,
    orderTask: index,
  }));
}

function areTasksEqual(a: TaskResponse[], b: TaskResponse[]) {
  if (a.length !== b.length) return false;

  return a.every((task, index) => {
    const nextTask = b[index];
    return (
      task.id === nextTask?.id &&
      task.listId === nextTask.listId &&
      task.orderTask === nextTask.orderTask
    );
  });
}

/**
 * Returns "before" | "after" | undefined based on where the pointer is
 * relative to the over task's center line.
 *
 * - "before"  → drop above the task (insert at overIndex)
 * - "after"   → drop below the task (insert at overIndex + 1)
 */
function getDropSideRelativeToTask(
  overRect: { top: number; bottom: number } | null | undefined,
  activeRect:
    | { top: number; bottom: number }
    | {
        current: {
          translated: { top: number; bottom: number } | null;
        };
      }
    | null
    | undefined,
): "before" | "after" | undefined {
  if (!overRect) return undefined;

  // `active.rect` is a ref-like object; read `.current.translated` when
  // available, otherwise accept a flat rect for direct callers.
  const flat =
    activeRect && "top" in activeRect
      ? activeRect
      : activeRect &&
          typeof activeRect === "object" &&
          "current" in activeRect
        ? activeRect.current?.translated
        : undefined;

  if (!flat) return undefined;
  const activeCenterY = (flat.top + flat.bottom) / 2;
  const overCenterY = (overRect.top + overRect.bottom) / 2;
  const offsetY = activeCenterY - overCenterY;
  return offsetY < 0 ? "before" : "after";
}

const dragOverlayModifiers: Modifier[] = [
  ({ transform }) => ({
    ...transform,
    scaleX: 1,
    scaleY: 1,
  }),
];

interface BoardDndProviderProps {
  lists: ListResponse[];
  boardId: string;
  isReorderDisabled: boolean;
}

export function BoardDndProvider({
  lists,
  boardId,
  isReorderDisabled,
}: BoardDndProviderProps) {
  const [orderedLists, setOrderedLists] = useState<ListResponse[]>(lists);
  const [activeTask, setActiveTask] = useState<TaskResponse | null>(null);
  const [activeTaskOverListId, setActiveTaskOverListId] = useState<
    string | null
  >(null);
  const draggedTaskRef = useRef<{
    taskId: string;
    sourceListId: string;
  } | null>(null);
  const dragSnapshotRef = useRef<Map<string, TaskResponse[]> | null>(null);
  const queryClient = useQueryClient();
  const { mutate: reorderLists } = useReorderList(boardId);
  const { mutate: moveTask } = useMoveTask();

  // Sync lists
  useEffect(() => {
    setOrderedLists([...lists].sort((a, b) => a.order - b.order));
  }, [lists]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const getTaskQuery = useCallback(
    (listId: string) =>
      queryClient.getQueryData<{
        success: boolean;
        data: TaskResponse[];
      }>(["tasks", listId]),
    [queryClient],
  );

  const getSortedTasks = useCallback(
    (listId: string) =>
      [...(getTaskQuery(listId)?.data ?? [])].sort(
        (a, b) => a.orderTask - b.orderTask,
      ),
    [getTaskQuery],
  );

  const setTaskQuery = useCallback(
    (listId: string, tasks: TaskResponse[]) => {
      const normalizedTasks = normalizeTasksForList(listId, tasks);

      queryClient.setQueryData(
        ["tasks", listId],
        (old: { success: boolean; data: TaskResponse[] } | undefined) => {
          if (!old) return old;
          if (areTasksEqual(old.data, normalizedTasks)) return old;
          return { ...old, data: normalizedTasks };
        },
      );
    },
    [queryClient],
  );

  const restoreTaskSnapshot = useCallback(
    (snapshot = dragSnapshotRef.current) => {
      snapshot?.forEach((tasks, listId) => {
        setTaskQuery(listId, tasks);
      });
    },
    [setTaskQuery],
  );

  const clearTaskDragState = useCallback(() => {
    draggedTaskRef.current = null;
    dragSnapshotRef.current = null;
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const data = active.data.current as DragData | undefined;
      if (!data) return;

      if (data.type === "task") {
        const taskId = String(active.id);
        const snapshot = new Map<string, TaskResponse[]>();

        for (const list of orderedLists) {
          const tasks = getTaskQuery(list.id)?.data;
          if (tasks) snapshot.set(list.id, tasks);
        }

        draggedTaskRef.current = { taskId, sourceListId: data.listId };
        dragSnapshotRef.current = snapshot;
        setActiveTask(data.task);
      }
    },
    [getTaskQuery, orderedLists],
  );

  const handleDragCancel = useCallback(() => {
    restoreTaskSnapshot();
    clearTaskDragState();
    setActiveTask(null);
    setActiveTaskOverListId(null);
  }, [clearTaskDragState, restoreTaskSnapshot]);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || !active.data.current) {
        setActiveTaskOverListId(null);
        return;
      }

      const data = active.data.current as DragData | undefined;
      if (!data || data.type !== "task") return;

      const overId = String(over.id);
      const overData = over.data.current as DragData | undefined;
      const targetListId = getTargetListId(overId, overData);

      setActiveTaskOverListId((current) =>
        current === targetListId ? current : targetListId,
      );
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      setActiveTaskOverListId(null);

      if (!over || !active.data.current) {
        restoreTaskSnapshot();
        clearTaskDragState();
        return;
      }

      const data = active.data.current as DragData | undefined;
      if (!data) {
        restoreTaskSnapshot();
        clearTaskDragState();
        return;
      }

      // Handle list reorder
      if (data.type === "list") {
        const overData = over.data.current as DragData | undefined;
        if (overData?.type !== "list") return;

        const oldIndex = orderedLists.findIndex((l) => l.id === active.id);
        const newIndex = orderedLists.findIndex((l) => l.id === over.id);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

        const previousLists = orderedLists;
        const nextLists = arrayMove(orderedLists, oldIndex, newIndex);
        setOrderedLists(nextLists);

        reorderLists(
          { listIds: nextLists.map((l) => l.id) },
          {
            onError: () => setOrderedLists(previousLists),
          },
        );
        return;
      }

      // Handle task move
      if (data.type !== "task") return;

      const taskId = String(active.id);
      const originalSourceListId =
        draggedTaskRef.current?.sourceListId ?? data.listId;

      const overId = String(over.id);
      const overData = over.data.current as DragData | undefined;
      const targetListId = getTargetListId(overId, overData);

      if (!targetListId) {
        restoreTaskSnapshot();
        clearTaskDragState();
        return;
      }

      // Determine the precise insertion side ("before" | "after")
      // using the active vs. over rectangle centers.
      const dropSide = getDropSideRelativeToTask(over?.rect, active.rect);

      const targetTasks = getSortedTasks(targetListId);
      const snapshot = dragSnapshotRef.current;
      const rollback = () => restoreTaskSnapshot(snapshot);

      if (originalSourceListId === targetListId) {
        // Same list reorder
        const oldIndex = targetTasks.findIndex((t) => t.id === taskId);
        let newIndex = targetTasks.length - 1;

        if (overData?.type === "task") {
          const overIndex = targetTasks.findIndex((t) => t.id === over.id);
          if (overIndex < 0) {
            newIndex = targetTasks.length - 1;
          } else {
            newIndex = overIndex + (dropSide === "after" ? 1 : 0);
          }
        }

        if (oldIndex < 0) {
          clearTaskDragState();
          return;
        }

        // Adjust for the removal of the dragged task when computing the
        // final splice position so the final array matches the user's
        // visual intent.
        if (newIndex > oldIndex) newIndex -= 1;

        if (oldIndex === newIndex) {
          clearTaskDragState();
          return;
        }

        const reordered = arrayMove(targetTasks, oldIndex, newIndex);
        setTaskQuery(targetListId, reordered);

        moveTask(
          {
            taskId,
            sourceListId: targetListId,
            targetListId,
            orderedTaskIds: reordered.map((t) => t.id),
          },
          { onError: rollback },
        );
      } else {
        // Cross-list move
        const targetAlreadyHasTask = targetTasks.some((t) => t.id === taskId);

        if (!targetAlreadyHasTask) {
          const currentSourceTasks = getSortedTasks(originalSourceListId);
          const currentTargetTasks = getSortedTasks(targetListId);

          const movingTask =
            currentSourceTasks.find((t) => t.id === taskId) ??
            currentTargetTasks.find((t) => t.id === taskId);

          if (!movingTask) {
            restoreTaskSnapshot();
            clearTaskDragState();
            return;
          }

          const newSourceTasks = currentSourceTasks.filter(
            (t) => t.id !== taskId,
          );

          let insertIndex = currentTargetTasks.length;
          if (overData?.type === "task") {
            const overIndex = currentTargetTasks.findIndex(
              (t) => t.id === over.id,
            );
            if (overIndex < 0) {
              insertIndex = currentTargetTasks.length;
            } else {
              insertIndex = overIndex + (dropSide === "after" ? 1 : 0);
            }
          }

          const newTargetTasks = [
            ...currentTargetTasks.slice(0, insertIndex),
            { ...movingTask, listId: targetListId },
            ...currentTargetTasks.slice(insertIndex),
          ];

          setTaskQuery(originalSourceListId, newSourceTasks);
          setTaskQuery(targetListId, newTargetTasks);

          moveTask(
            {
              taskId,
              sourceListId: originalSourceListId,
              targetListId,
              orderedTaskIds: newTargetTasks.map((t) => t.id),
            },
            { onError: rollback },
          );
        } else {
          // Task already in target (from dragOver), just call API
          moveTask(
            {
              taskId,
              sourceListId: originalSourceListId,
              targetListId,
              orderedTaskIds: targetTasks.map((t) => t.id),
            },
            { onError: rollback },
          );
        }
      }
      clearTaskDragState();
    },
    [
      clearTaskDragState,
      getSortedTasks,
      moveTask,
      orderedLists,
      reorderLists,
      restoreTaskSnapshot,
      setTaskQuery,
    ],
  );

  const collisionDetection = useCallback<CollisionDetection>(
    (args) => {
      const activeData = args.active.data.current as DragData | undefined;

      // Filter containers based on drag type
      const filteredContainers = args.droppableContainers.filter(
        (container) => {
          const data = container.data.current as DragData | undefined;

          if (activeData?.type === "list") {
            return data?.type === "list";
          }

          if (activeData?.type === "task") {
            return data?.type === "task" || data?.type === "task-list";
          }

          return true;
        },
      );

      const filteredArgs = { ...args, droppableContainers: filteredContainers };

      // 1) Prefer precise pointer-within collisions (mouse is over a task).
      const pointerCollisions = pointerWithin(filteredArgs);
      if (pointerCollisions.length > 0) {
        return pointerCollisions;
      }

      // 2) Fallback: rect intersection gives us the most accurate drop
      //    position (top/bottom half of the target) so we can compute
      //    "before" / "after" in handleDragEnd.
      const rectCollisions = rectIntersection(filteredArgs);
      if (rectCollisions.length > 0) {
        return rectCollisions;
      }

      // 3) Last resort: fall back to closest center to keep drag alive
      //    when the pointer is over the list container itself (e.g. the
      //    trailing empty area inside a list).
      const closest = getFirstCollision(closestCenter(filteredArgs));
      return closest ? [closest] : [];
    },
    [],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={orderedLists.map((l) => l.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="flex gap-4 w-full overflow-x-auto pb-4">
          <AnimatePresence mode="popLayout">
            {orderedLists.map((list, index) => (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <TaskListWrapper
                  list={list}
                  boardId={boardId}
                  disabled={isReorderDisabled}
                  isTaskDragOver={activeTaskOverListId === list.id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>

      <DragOverlay
        dropAnimation={{
          duration: 180,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        modifiers={dragOverlayModifiers}
      >
        {activeTask ? (
          <div className="w-72 cursor-grabbing rotate-1 opacity-95 shadow-2xl">
            <TaskCard task={activeTask} listId="" isDragging={true} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Wrapper for list with droppable zone
interface TaskListWrapperProps {
  list: ListResponse;
  boardId: string;
  disabled?: boolean;
  isTaskDragOver?: boolean;
}

function TaskListWrapper({
  list,
  boardId,
  disabled,
  isTaskDragOver,
}: TaskListWrapperProps) {
  const { data: tasksData, isLoading, isError } = useTasks(list.id);
  const tasks = tasksData?.data ?? [];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    disabled,
    data: { type: "list", list },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const renderTask = useCallback(
    (task: TaskResponse) => (
      <SortableTaskCard
        key={task.id}
        task={task}
        listId={list.id}
        disabled={disabled}
      />
    ),
    [list.id, disabled],
  );

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ListColumn
        list={list}
        boardId={boardId}
        tasks={tasks}
        isLoadingTasks={isLoading}
        isErrorTasks={isError}
        renderTask={renderTask}
        taskSortableItems={tasks.map((task) => task.id)}
        disabled={disabled}
        listDropId={`list:${list.id}`}
        dragHandleListeners={listeners}
        isDragging={isDragging}
        isTaskDragOver={isTaskDragOver}
      />
    </div>
  );
}
