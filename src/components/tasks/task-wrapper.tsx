// import type { ListResponse } from "@/features/lists/types";
// import { useTasks } from "@/features/tasks/hooks/useTasks";
// import type { TaskResponse } from "@/features/tasks/types";
// import { useSortable } from "@dnd-kit/sortable";
// import { useCallback } from "react";
// import { SortableTaskCard } from "./sortable-task-card";
// import { ListColumn } from "../lists/list-column";

// const dragOverlayModifiers: Modifier[] = [
//     ({ transform }) => ({
//       ...transform,
//       scaleX: 1,
//       scaleY: 1,
//     }),
//   ];

// interface TaskListWrapperProps {
//     list: ListResponse;
//     boardId: string;
//     disabled?: boolean;
//     isTaskDragOver?: boolean;
//   }
  
//   export function TaskListWrapper({
//     list,
//     boardId,
//     disabled,
//     isTaskDragOver,
//   }: TaskListWrapperProps) {
//     const { data: tasksData, isLoading, isError } = useTasks(list.id);
//     const tasks = tasksData?.data ?? [];
  
//     const {
//       attributes,
//       listeners,
//       setNodeRef,
//       transform,
//       transition,
//       isDragging,
//     } = useSortable({
//       id: list.id,
//       disabled,
//       data: { type: "list", list },
//     });
  
//     const style = {
//       transform: CSS.Transform.toString(transform),
//       transition,
//       opacity: isDragging ? 0.4 : 1,
//       zIndex: isDragging ? 50 : undefined,
//     };
  
//     const renderTask = useCallback(
//       (task: TaskResponse) => (
//         <SortableTaskCard
//           key={task.id}
//           task={task}
//           listId={list.id}
//           disabled={disabled}
//         />
//       ),
//       [list.id, disabled],
//     );
  
//     return (
//       <div ref={setNodeRef} style={style} {...attributes}>
//         <ListColumn
//           list={list}
//           boardId={boardId}
//           tasks={tasks}
//           isLoadingTasks={isLoading}
//           isErrorTasks={isError}
//           renderTask={renderTask}
//           taskSortableItems={tasks.map((task) => task.id)}
//           disabled={disabled}
//           listDropId={`list:${list.id}`}
//           dragHandleListeners={listeners}
//           isDragging={isDragging}
//           isTaskDragOver={isTaskDragOver}
//         />
//       </div>
//     );
//   }
  