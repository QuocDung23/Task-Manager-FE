import { formatDateTime } from "@/utils/formatDateTime";
import type { TaskActivity } from "../types";

function value(metadata: Record<string, unknown>, key: string): string {
  return typeof metadata[key] === "string" ? metadata[key] : "";
}

function entityName(
  metadata: Record<string, unknown>,
  key: "user" | "tag",
): string {
  const entity = metadata[key];
  if (!entity || typeof entity !== "object") return "";
  const name = (entity as Record<string, unknown>).name;
  return typeof name === "string" ? name : "";
}

export function presentTaskActivity(activity: TaskActivity): {
  text: string;
  detail?: string;
} {
  const actor = activity.actor?.name ?? "System";
  const metadata = activity.metadata;
  switch (activity.type) {
    case "TASK_CREATED":
      return { text: `${actor} created this task` };
    case "TASK_NAME_CHANGED":
      return {
        text: `${actor} renamed this task`,
        detail: `${value(metadata, "from")} -> ${value(metadata, "to")}`,
      };
    case "TASK_DESCRIPTION_CHANGED":
      return { text: `${actor} updated the description` };
    case "TASK_ASSIGNEE_ADDED":
      return { text: `${actor} assigned ${entityName(metadata, "user") || "a member"}` };
    case "TASK_ASSIGNEE_REMOVED":
      return { text: `${actor} unassigned ${entityName(metadata, "user") || "a member"}` };
    case "TASK_TAG_ADDED":
      return { text: `${actor} added label ${entityName(metadata, "tag") || "Unknown"}` };
    case "TASK_TAG_REMOVED":
      return { text: `${actor} removed label ${entityName(metadata, "tag") || "Unknown"}` };
    case "TASK_SCHEDULE_SET":
      return { text: `${actor} scheduled this task`, detail: formatDateTime(value(metadata, "newDueDate")) };
    case "TASK_RESCHEDULED":
      return { text: `${actor} rescheduled this task`, detail: formatDateTime(value(metadata, "newDueDate")) };
    case "TASK_SCHEDULE_CLEARED":
      return { text: `${actor} cleared the schedule` };
    case "TASK_DUE_SOON":
      return { text: "This task is due soon" };
    case "TASK_OVERDUE_LOCKED":
      return { text: "System marked this task overdue and locked it" };
    case "TASK_UNLOCKED":
      return { text: `${actor} unlocked this task` };
    case "TASK_STATUS_CHANGED":
      return {
        text: `${actor} changed status`,
        detail: `${value(metadata, "from").replace(/_/g, " ")} -> ${value(metadata, "to").replace(/_/g, " ")}`,
      };
    default:
      return { text: "Task was updated" };
  }
}
