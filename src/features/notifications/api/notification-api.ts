import { axiosLocal } from "@/services/axios";
import type {
  NotificationFilter,
  NotificationListResponse,
  NotificationResponse,
  UnreadCountResponse,
} from "../types";

type ItemResponse = { success: true; data: NotificationResponse };

export const notificationApi = {
  list: async (filter: NotificationFilter, cursor?: string, limit = 20) => {
    const response = await axiosLocal.get<NotificationListResponse>("/notification", {
      params: { filter, cursor, limit },
    });
    return response.data;
  },
  unreadCount: async () => {
    const response = await axiosLocal.get<UnreadCountResponse>("/notification/unread-count");
    return response.data;
  },
  markRead: async (id: string) => {
    const response = await axiosLocal.patch<ItemResponse>(`/notification/${id}/read`);
    return response.data;
  },
  markUnread: async (id: string) => {
    const response = await axiosLocal.patch<ItemResponse>(`/notification/${id}/unread`);
    return response.data;
  },
  markAllRead: async (before: string) => {
    const response = await axiosLocal.patch("/notification/read-all", { before });
    return response.data;
  },
};
