import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ListResponse } from "@/features/lists/types";
import { ListColumn } from "./list-column";

interface SortableListColumnProps {
  list: ListResponse;
  boardId: string;
  disabled?: boolean;
}

export function SortableListColumn({
  list,
  boardId,
  disabled,
}: SortableListColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ListColumn
        list={list}
        boardId={boardId}
        dragHandleListeners={listeners}
        isDragging={isDragging}
        disabled={disabled}
      />
    </div>
  );
}
