import { formatDateTime } from "@/utils/formatDateTime";
import type { TaskActivity } from "../types";
import { t } from "@/services/i18n";
import { getLocalizedStatusActionMeta, isKnownTaskStatusAction } from "@/features/tasks/utils/status-action";

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

function statusName(value: string): string {
  return isKnownTaskStatusAction(value)
    ? getLocalizedStatusActionMeta(value).label
    : value.replace(/_/g, " ");
}

export function presentTaskActivity(activity: TaskActivity): {
  text: string;
  detail?: string;
} {
  const actor = activity.actor?.name ?? t("activity.system");
  const metadata = activity.metadata;
  switch (activity.type) {
    case "TASK_CREATED":
      return { text: t("activity.created", { actor }) };
    case "TASK_NAME_CHANGED":
      return {
        text: t("activity.renamed", { actor }),
        detail: `${value(metadata, "from")} -> ${value(metadata, "to")}`,
      };
    case "TASK_DESCRIPTION_CHANGED":
      return { text: t("activity.description", { actor }) };
    case "TASK_ASSIGNEE_ADDED":
      return { text: t("activity.assigned", { actor, name: entityName(metadata, "user") || t("activity.member") }) };
    case "TASK_ASSIGNEE_REMOVED":
      return { text: t("activity.unassigned", { actor, name: entityName(metadata, "user") || t("activity.member") }) };
    case "TASK_TAG_ADDED":
      return { text: t("activity.tagAdded", { actor, name: entityName(metadata, "tag") || t("activity.unknown") }) };
    case "TASK_TAG_REMOVED":
      return { text: t("activity.tagRemoved", { actor, name: entityName(metadata, "tag") || t("activity.unknown") }) };
    case "TASK_SCHEDULE_SET":
      return { text: t("activity.scheduled", { actor }), detail: formatDateTime(value(metadata, "newDueDate")) };
    case "TASK_RESCHEDULED":
      return { text: t("activity.rescheduled", { actor }), detail: formatDateTime(value(metadata, "newDueDate")) };
    case "TASK_SCHEDULE_CLEARED":
      return { text: t("activity.scheduleCleared", { actor }) };
    case "TASK_DUE_SOON":
      return { text: t("activity.dueSoon") };
    case "TASK_OVERDUE_LOCKED":
      return { text: t("activity.overdueLocked") };
    case "TASK_UNLOCKED":
      return { text: t("activity.unlocked", { actor }) };
    case "TASK_STATUS_CHANGED":
      return {
        text: t("activity.statusChanged", { actor }),
        detail: `${statusName(value(metadata, "from"))} → ${statusName(value(metadata, "to"))}`,
      };
    default:
      return { text: t("activity.updated") };
  }
}
