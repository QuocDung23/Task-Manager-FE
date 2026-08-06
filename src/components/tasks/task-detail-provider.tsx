import {
  useCallback,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { TaskDetailContext } from "./task-detail-context";
import type { TaskResponse } from "@/features/tasks/types";

interface TaskDetailProviderProps {
  children: ReactNode;
  boardId?: string;
}

export function TaskDetailProvider({
  children,
  boardId,
}: TaskDetailProviderProps) {
  const [selectedTask, setSelectedTask] = useState<TaskResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [, startTransition] = useTransition();

  const openTask = useCallback((task: TaskResponse) => {
    startTransition(() => {
      setSelectedTask(task);
      setIsOpen(true);
    });
  }, []);

  const closeTask = useCallback(() => {
    setIsOpen(false);
    setSelectedTask(null);
  }, []);

  const updateSelectedTask = useCallback((task: TaskResponse) => {
    setSelectedTask((current) => {
      if (!current || current.id !== task.id) return current;
      return task;
    });
  }, []);

  return (
    <TaskDetailContext.Provider
      value={{
        selectedTask,
        isOpen,
        isPending: false,
        boardId: boardId ?? null,
        openTask,
        closeTask,
        updateSelectedTask,
      }}
    >
      {children}
    </TaskDetailContext.Provider>
  );
}
