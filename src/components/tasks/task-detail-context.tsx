import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import type { TaskResponse } from "@/features/tasks/types";

interface TaskDetailContextValue {
  selectedTask: TaskResponse | null;
  isOpen: boolean;
  isPending: boolean;
  openTask: (task: TaskResponse) => void;
  closeTask: () => void;
}

const TaskDetailContext = createContext<TaskDetailContextValue | null>(null);

export function TaskDetailProvider({ children }: { children: ReactNode }) {
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

  return (
    <TaskDetailContext.Provider
      value={{
        selectedTask,
        isOpen,
        isPending: false,
        openTask,
        closeTask,
      }}
    >
      {children}
    </TaskDetailContext.Provider>
  );
}

export function useTaskDetail() {
  const ctx = useContext(TaskDetailContext);
  if (!ctx) {
    throw new Error("useTaskDetail must be used within TaskDetailProvider");
  }
  return ctx;
}
