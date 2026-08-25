import type { NotificationResponse } from "../types";

export function getNotificationPath(notification: NotificationResponse): string | null {
  const { projectId, boardId, taskId, commentId } = notification.context;
  if (boardId) {
    const params = new URLSearchParams();
    if (taskId) params.set("taskId", taskId);
    if (commentId) {
      params.set("commentId", commentId);
    }
    const query = params.toString();
    return `/board/${boardId}${query ? `?${query}` : ""}`;
  }
  if (projectId) return `/project/${projectId}`;
  return null;
}
