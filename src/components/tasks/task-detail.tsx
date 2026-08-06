import TaskDetailContent from "./task-detail-content";
import { useTaskDetail } from "./use-task-detail";
import { useBoard } from "@/features/boards/hooks/useBoard";
import { useListById } from "@/features/lists/hooks/useListById";

export function TaskDetail() {
  const {
    selectedTask: task,
    isOpen,
    closeTask,
    boardId,
  } = useTaskDetail();

  const boardQuery = useBoard(boardId ?? "");
  const listQuery = useListById(task?.listId);

  if (!task) {
    return null;
  }

  return (
    <TaskDetailContent
      key={task.id}
      task={task}
      isOpen={isOpen}
      closeTask={closeTask}
      boardTitle={boardQuery.data?.data?.name}
      listTitle={listQuery.data?.name}
    />
  );
}
