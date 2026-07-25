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
  boardId: string | null;
  openTask: (task: TaskResponse) => void;
  closeTask: () => void;
  /**
   * Cập nhật task đang mở trong dialog sau khi mutation (assign/unassign/update).
   * Chỉ thay thế khi id khớp để tránh ghi đè task khác.
   */
  updateSelectedTask: (task: TaskResponse) => void;
}

const TaskDetailContext = createContext<TaskDetailContextValue | null>(null);

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

export function useTaskDetail() {
  const ctx = useContext(TaskDetailContext);
  if (!ctx) {
    throw new Error("useTaskDetail must be used within TaskDetailProvider");
  }
  return ctx;
}