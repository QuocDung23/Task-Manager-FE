export type NotificationPriority = "NORMAL" | "DIRECT" | "URGENT";
export type NotificationFilter = "all" | "unread";

export type NotificationResponse = {
  id: string;
  type: string;
  priority: NotificationPriority;
  title: string;
  body: string;
  actor: { id: string; name: string; avatar: string | null } | null;
  context: {
    projectId: string | null;
    boardId: string | null;
    taskId: string | null;
    commentId: string | null;
  };
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListResponse = {
  success: true;
  data: { items: NotificationResponse[]; nextCursor: string | null };
};

export type UnreadCountResponse = {
  success: true;
  data: { count: number };
};
