import type { NotificationFilter } from "../types";

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => ["notifications", "list"] as const,
  list: (filter: NotificationFilter) => ["notifications", "list", filter] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
};
