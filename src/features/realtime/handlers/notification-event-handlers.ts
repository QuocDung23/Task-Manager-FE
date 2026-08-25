import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  NotificationFilter,
  NotificationListResponse,
  NotificationResponse,
  UnreadCountResponse,
} from "@/features/notifications/types";
import { notificationKeys } from "@/features/notifications/utils/notification-query-keys";
import type { ServerToClientEvents } from "../contracts/realtime-events";
import type { TypedSocket } from "../socket";

const receivedIds = new Set<string>();

function updateLists(
  queryClient: QueryClient,
  update: (
    data: InfiniteData<NotificationListResponse>,
    filter: NotificationFilter,
  ) => InfiniteData<NotificationListResponse>,
): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: notificationKeys.lists() });

  for (const query of queries) {
    const filter = query.queryKey[2];
    if (filter !== "all" && filter !== "unread") continue;

    queryClient.setQueryData<InfiniteData<NotificationListResponse>>(
      query.queryKey,
      (current) => (current ? update(current, filter) : current),
    );
  }
}

function findNotificationInCache(
  data: InfiniteData<NotificationListResponse>,
  notificationId: string,
) {
  for (const page of data.pages) {
    const item = page.data.items.find((i) => i.id === notificationId);
    if (item) return item;
  }
  return null;
}

export function registerNotificationEventHandlers(
  socket: TypedSocket,
  queryClient: QueryClient,
): () => void {
  const handleCreated: ServerToClientEvents["notification:created"] = (payload) => {
    const notification = payload.data.notification;
    if (receivedIds.has(notification.id)) return;
    receivedIds.add(notification.id);
    updateLists(queryClient, (current) => {
      if (current.pages.some((page) => page.data.items.some((item) => item.id === notification.id))) return current;
      const first = current.pages[0];
      if (!first) return current;
      return {
        ...current,
        pages: [
          { ...first, data: { ...first.data, items: [notification, ...first.data.items] } },
          ...current.pages.slice(1),
        ],
      };
    });
    if (!notification.readAt) {
      queryClient.setQueryData<UnreadCountResponse>(
        notificationKeys.unreadCount(),
        (current) => ({
          success: true,
          data: { count: (current?.data.count ?? 0) + 1 },
        }),
      );
    }
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      (notification.priority === "URGENT" || notification.priority === "DIRECT")
    ) {
      toast(notification.title, { id: notification.id, description: notification.body });
    }
  };

  const handleReadState: ServerToClientEvents["notification:read_state_changed"] = (payload) => {
    const { notificationId, readAt } = payload.data;
    let delta = 0;
    updateLists(queryClient, (current, filter) => {
      const oldItem = findNotificationInCache(current, notificationId);
      if (!oldItem) return current;
      const wasUnread = oldItem.readAt === null;
      const isUnread = readAt === null;

      if (wasUnread && !isUnread) delta = -1;
      else if (!wasUnread && isUnread) delta = 1;

      if (delta === 0) return current;

      if (readAt !== null && filter === "unread") {
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            data: {
              ...page.data,
              items: page.data.items.filter((item) => item.id !== notificationId),
            },
          })),
        };
      }

      if (readAt === null && filter === "unread") {
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            data: {
              ...page.data,
              items: page.data.items.map((item) =>
                item.id === notificationId ? { ...item, readAt } : item,
              ),
            },
          })),
        };
      }

      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          data: {
            ...page.data,
            items: page.data.items.map((item) =>
              item.id === notificationId ? { ...item, readAt } : item,
            ),
          },
        })),
      };
    });
    if (delta !== 0) {
      queryClient.setQueryData<UnreadCountResponse>(
        notificationKeys.unreadCount(),
        (current) => ({
          success: true,
          data: { count: Math.max(0, (current?.data.count ?? 0) + delta) },
        }),
      );
    }
    if (readAt === null) {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.list("unread"),
      });
    }
  };

  const handleReadAll: ServerToClientEvents["notification:read_all"] = (payload) => {
    const { before, readAt } = payload.data;
    const beforeTime = new Date(before).getTime();
    let affectedCount = 0;

    const shouldMarkRead = (item: NotificationResponse): boolean =>
      new Date(item.createdAt).getTime() <= beforeTime && !item.readAt;

    updateLists(queryClient, (current, filter) => {
      if (filter === "unread") {
        let filteredItems: NotificationResponse[] = [];
        let removedCount = 0;
        for (const page of current.pages) {
          const remaining = page.data.items.filter((item) => {
            if (shouldMarkRead(item)) {
              removedCount++;
              return false;
            }
            return true;
          });
          filteredItems = [...filteredItems, ...remaining];
        }
        affectedCount = removedCount;
        return {
          ...current,
          pages: [{
            ...current.pages[0],
            data: { items: filteredItems, nextCursor: current.pages[0]?.data.nextCursor ?? null },
          }],
        };
      }

      const updatedPages = current.pages.map((page) => ({
        ...page,
        data: {
          ...page.data,
          items: page.data.items.map((item) =>
            shouldMarkRead(item) ? { ...item, readAt } : item,
          ),
        },
      }));
      return { ...current, pages: updatedPages };
    });

    if (affectedCount > 0) {
      queryClient.setQueryData<UnreadCountResponse>(
        notificationKeys.unreadCount(),
        (current) => ({
          success: true,
          data: { count: Math.max(0, (current?.data.count ?? 0) - affectedCount) },
        }),
      );
    }
  };

  socket.on("notification:created", handleCreated);
  socket.on("notification:read_state_changed", handleReadState);
  socket.on("notification:read_all", handleReadAll);
  return () => {
    socket.off("notification:created", handleCreated);
    socket.off("notification:read_state_changed", handleReadState);
    socket.off("notification:read_all", handleReadAll);
  };
}
