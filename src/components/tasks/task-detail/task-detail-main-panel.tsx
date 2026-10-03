import type { TaskResponse } from "@/features/tasks/types";
import { TaskDetailMetaBar } from "./task-detail-meta-bar";
import { TaskDetailDescription } from "./task-detail-description";

type TaskDetailMainPanelProps = {
  task: TaskResponse;
  isUpdating: boolean;
  onSaveDescription: (description: string | undefined) => void;
  onTaskUpdated: (task: TaskResponse) => void;
};

export function TaskDetailMainPanel({
  task,
  isUpdating,
  onSaveDescription,
  onTaskUpdated,
}: TaskDetailMainPanelProps) {
  return (
    <div className="flex w-full min-w-0 flex-col md:w-[58%] md:overflow-y-auto">
      <TaskDetailMetaBar
        task={task}
        isUpdating={isUpdating}
        onTaskUpdated={onTaskUpdated}
      />

      <TaskDetailDescription
        task={task}
        isUpdating={isUpdating}
        onSaveDescription={onSaveDescription}
      />
    </div>
  );
}