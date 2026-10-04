import { t, type TranslationKey } from "@/services/i18n";
import type { NotificationResponse } from "../types";

export type NotificationDisplay = { title: string; body: string };

function getDataString(notification: NotificationResponse, key: string): string | null {
  const value = notification.data?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getQuotedName(body: string): string | null {
  // Older inbox records keep entity names only inside the rendered English body.
  return body.match(/"(.+)"/)?.[1] ?? null;
}

function getName(notification: NotificationResponse, key: string): string | null {
  return getDataString(notification, key) ?? getQuotedName(notification.body);
}

function display(
  notification: NotificationResponse,
  titleKey: TranslationKey,
  bodyKey: TranslationKey,
  params: Record<string, string> | null,
): NotificationDisplay {
  return {
    title: t(titleKey),
    body: params ? t(bodyKey, params) : notification.body,
  };
}

function withName(
  notification: NotificationResponse,
  titleKey: TranslationKey,
  bodyKey: TranslationKey,
  dataKey: string,
): NotificationDisplay {
  const name = getName(notification, dataKey);
  return display(notification, titleKey, bodyKey, name ? { [dataKey]: name } : null);
}

function getRole(notification: NotificationResponse, scope: "project" | "board"): string | null {
  const roleName = getDataString(notification, "roleName");
  if (roleName === `${scope.toUpperCase()}_ADMIN`) return t(scope === "project" ? "notification.projectAdmin" : "notification.boardAdmin");
  if (roleName === `${scope.toUpperCase()}_MEMBER`) return t(scope === "project" ? "notification.projectMember" : "notification.boardMember");
  return null;
}

const STATUS_KEYS: Record<string, TranslationKey> = {
  TODO: "status.todo",
  IN_PROGRESS: "status.inProgress",
  IN_REVIEW: "status.inReview",
  DONE: "status.done",
  PAUSED: "status.paused",
  FIXED: "status.fixed",
  CANCELLED: "status.cancelled",
};

export function presentNotification(notification: NotificationResponse): NotificationDisplay {
  switch (notification.type) {
    case "PROJECT_INVITATION_RECEIVED":
      return withName(notification, "notification.invitationReceivedTitle", "notification.invitationReceivedBody", "projectName");
    case "PROJECT_INVITATION_DECLINED": {
      const projectName = getName(notification, "projectName");
      const actorName = getDataString(notification, "actorName") ?? notification.actor?.name ?? t("notification.teammate");
      return display(notification, "notification.invitationDeclinedTitle", "notification.invitationDeclinedBody", projectName ? { actorName, projectName } : null);
    }
    case "MEMBER_REMOVED":
      return withName(notification, "notification.memberRemovedTitle", "notification.memberRemovedBody", "projectName");
    case "PROJECT_MEMBER_LEFT":
    case "BOARD_MEMBER_LEFT": {
      const isProject = notification.type === "PROJECT_MEMBER_LEFT";
      const nameKey = isProject ? "projectName" : "boardName";
      const name = getName(notification, nameKey);
      const actorName = notification.actor?.name ?? (notification.body.includes(' left "') ? notification.body.split(' left "')[0] : t("notification.teammate"));
      return display(
        notification,
        isProject ? "notification.projectMemberLeftTitle" : "notification.boardMemberLeftTitle",
        isProject ? "notification.projectMemberLeftBody" : "notification.boardMemberLeftBody",
        name ? { actorName, [nameKey]: name } : null,
      );
    }
    case "BOARD_MEMBER_ADDED":
      return withName(notification, "notification.boardMemberAddedTitle", "notification.boardMemberAddedBody", "boardName");
    case "PROJECT_MEMBER_ROLE_CHANGED":
    case "BOARD_MEMBER_ROLE_CHANGED": {
      const isProject = notification.type === "PROJECT_MEMBER_ROLE_CHANGED";
      const nameKey = isProject ? "projectName" : "boardName";
      const name = getName(notification, nameKey);
      const role = getRole(notification, isProject ? "project" : "board");
      return display(
        notification,
        isProject ? "notification.projectRoleChangedTitle" : "notification.boardRoleChangedTitle",
        isProject ? "notification.projectRoleChangedBody" : "notification.boardRoleChangedBody",
        name && role ? { [nameKey]: name, role } : null,
      );
    }
    case "TASK_ASSIGNED":
      return withName(notification, "notification.assignedTitle", "notification.assignedBody", "taskName");
    case "TASK_UNASSIGNED":
      return withName(notification, "notification.unassignedTitle", "notification.unassignedBody", "taskName");
    case "TASK_RESCHEDULED":
      return withName(notification, "notification.rescheduledTitle", "notification.rescheduledBody", "taskName");
    case "TASK_SCHEDULE_CLEARED":
      return withName(notification, "notification.scheduleClearedTitle", "notification.scheduleClearedBody", "taskName");
    case "TASK_UNLOCKED":
      return withName(notification, "notification.unlockedTitle", "notification.unlockedBody", "taskName");
    case "TASK_DUE_SOON":
      return withName(notification, "notification.dueSoonTitle", "notification.dueSoonBody", "taskName");
    case "TASK_OVERDUE_LOCKED":
      return withName(notification, "notification.overdueLockedTitle", "notification.overdueLockedBody", "taskName");
    case "TASK_STATUS_CHANGED": {
      const taskName = getName(notification, "taskName");
      const action = getDataString(notification, "statusAction");
      const statusKey = action ? STATUS_KEYS[action] : null;
      return display(notification, "notification.statusChangedTitle", "notification.statusChangedBody", taskName && statusKey ? { taskName, status: t(statusKey) } : null);
    }
    case "TASK_COMMENTED":
    case "TASK_COMMENT_REPLIED": {
      const taskName = getName(notification, "taskName");
      const actorName = notification.actor?.name ?? t("notification.teammate");
      const isReply = notification.type === "TASK_COMMENT_REPLIED";
      return display(
        notification,
        isReply ? "notification.repliedTitle" : "notification.commentedTitle",
        isReply ? "notification.repliedBody" : "notification.commentedBody",
        taskName ? { actorName, taskName } : null,
      );
    }
    default:
      return { title: notification.title, body: notification.body };
  }
}
