import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { notificationApi } from "../api/notification-api";
import type { NotificationFilter } from "../types";
import { notificationKeys } from "../utils/notification-query-keys";

export function useNotifications(filter: NotificationFilter) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(filter),
    queryFn: ({ pageParam }) => notificationApi.list(filter, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.data.nextCursor ?? undefined,
    staleTime: 15_000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: notificationApi.unreadCount,
    staleTime: 15_000,
  });
}

function useReadState(read: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      read ? notificationApi.markRead(id) : notificationApi.markUnread(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkNotificationRead() {
  return useReadState(true);
}

export function useMarkNotificationUnread() {
  return useReadState(false);
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
