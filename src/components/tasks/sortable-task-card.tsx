"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TaskResponse } from "@/features/tasks/types";
import { TaskCard } from "./task-card";

type SortableTaskCardProps = {
  task: TaskResponse;
  listId: string;
  disabled?: boolean;
};

export function SortableTaskCard({
  task,
  listId,
  disabled,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled,
    data: { type: "task", task, listId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: "relative" as const,
    willChange: transform ? "transform" : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="touch-none"
      data-dragging={isDragging}
    >
      {isDragging ? (
        <div className="min-h-10 rounded-md border border-dashed border-border" />
      ) : (
        <TaskCard
          task={task}
          listId={listId}
          dragHandleAttributes={attributes}
          dragHandleListeners={listeners}
          disabled={disabled}
        />
      )}
    </div>
  );
}
