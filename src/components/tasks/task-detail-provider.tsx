import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { TaskDetailContext } from "./task-detail-context";
import type { TaskResponse } from "@/features/tasks/types";
import { taskApi } from "@/features/tasks/api/task-api";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedTaskId = searchParams.get("taskId");

  const openTask = useCallback((task: TaskResponse) => {
    startTransition(() => {
      setSelectedTask(task);
      setIsOpen(true);
    });
  }, []);

  const closeTask = useCallback(() => {
    setIsOpen(false);
    setSelectedTask(null);
    if (searchParams.has("taskId")) {
      const next = new URLSearchParams(searchParams);
      next.delete("taskId");
      next.delete("tab");
      next.delete("commentId");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const updateSelectedTask = useCallback((task: TaskResponse) => {
    setSelectedTask((current) => {
      if (!current || current.id !== task.id) return current;
      return task;
    });
  }, []);

  useEffect(() => {
    if (!linkedTaskId || selectedTask?.id === linkedTaskId) return;
    let cancelled = false;
    void taskApi
      .getById(linkedTaskId)
      .then((response) => {
        if (cancelled) return;
        setSelectedTask(response.data);
        setIsOpen(true);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("You no longer have access to this item.");
        const next = new URLSearchParams(searchParams);
        next.delete("taskId");
        next.delete("tab");
        next.delete("commentId");
        setSearchParams(next, { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [linkedTaskId, searchParams, selectedTask?.id, setSearchParams]);

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
