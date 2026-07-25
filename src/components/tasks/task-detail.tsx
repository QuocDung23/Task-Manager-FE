import TaskDetailContent from "./task-detail-content";
import { useTaskDetail } from "./task-detail-context";

export function TaskDetail() {
    const { selectedTask: task, isOpen, closeTask } =
    useTaskDetail();

  if (!task) {
    return null;
  }

  return (
    <TaskDetailContent
      key={task.id}
      task={task}
      isOpen={isOpen}
      closeTask={closeTask}
    />
  );
}
