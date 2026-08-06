import { createContext } from "react";
import type { TaskResponse } from "@/features/tasks/types";

export interface TaskDetailContextValue {
  selectedTask: TaskResponse | null;
  isOpen: boolean;
  isPending: boolean;
  boardId: string | null;
  openTask: (task: TaskResponse) => void;
  closeTask: () => void;
  updateSelectedTask: (task: TaskResponse) => void;
}

export const TaskDetailContext = createContext<TaskDetailContextValue | null>(
  null,
);
