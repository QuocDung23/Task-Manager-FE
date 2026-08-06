import { useContext } from "react";
import { TaskDetailContext } from "./task-detail-context";

export function useTaskDetail() {
  const ctx = useContext(TaskDetailContext);
  if (!ctx) {
    throw new Error("useTaskDetail must be used within TaskDetailProvider");
  }
  return ctx;
}
