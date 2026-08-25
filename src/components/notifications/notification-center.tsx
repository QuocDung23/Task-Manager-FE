import { useState } from "react";
import { Bell, Bot, CheckCheck, Loader2, MoreHorizontal, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/users/user-avatar";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMarkNotificationUnread,
  useNotifications,
  useUnreadNotificationCount,
} from "@/features/notifications/hooks/useNotifications";
import type { NotificationFilter, NotificationResponse } from "@/features/notifications/types";
import { getNotificationPath } from "@/features/notifications/utils/notification-navigation";
import { formatDateTime } from "@/utils/formatDateTime";

export function NotificationCenter({ onNavigate }: { onNavigate?: () => void }) {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const query = useNotifications(filter);
  const countQuery = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markUnread = useMarkNotificationUnread();
  const markAll = useMarkAllNotificationsRead();
  const navigate = useNavigate();
  const items = query.data?.pages.flatMap((page) => page.data.items) ?? [];
  const count = countQuery.data?.data.count ?? 0;

  const openItem = (item: NotificationResponse) => {
    if (!item.readAt) markRead.mutate(item.id);
    const path = getNotificationPath(item);
    if (path) navigate(path);
    onNavigate?.();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-foreground/8 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-[15px] font-semibold">Notifications</h2>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">{count} unread</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={count === 0 || markAll.isPending}
            onClick={() => markAll.mutate(new Date().toISOString())}
          >
            {markAll.isPending ? <Loader2 className="animate-spin" /> : <CheckCheck />}
            Mark all read
          </Button>
        </div>
        <div className="mt-3 inline-flex rounded-md bg-muted p-0.5" role="tablist">
          {(["all", "unread"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={`h-7 rounded-[5px] px-3 text-[11.5px] font-medium capitalize transition-colors ${filter === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {value}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {query.isLoading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex gap-3 py-2">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-full" /></div>
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <div className="grid min-h-64 place-items-center text-center">
            <div><p className="text-sm font-medium">Could not load notifications</p><Button variant="ghost" size="sm" className="mt-2" onClick={() => void query.refetch()}><RefreshCw />Retry</Button></div>
          </div>
        ) : items.length === 0 ? (
          <div className="grid min-h-64 place-items-center text-center">
            <div><Bell className="mx-auto size-5 text-muted-foreground" /><p className="mt-3 text-sm font-medium">{filter === "unread" ? "You're all caught up" : "No notifications yet"}</p></div>
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id} className="group relative">
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  className={`flex w-full gap-3 rounded-md px-2.5 py-3 pr-9 text-left outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/30 ${item.readAt ? "" : "bg-primary/5"}`}
                >
                  {item.actor ? <UserAvatar name={item.actor.name} avatar={item.actor.avatar} size="sm" /> : <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Bot className="size-4" /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{item.title}</span>
                      {!item.readAt ? <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[11.5px] leading-4 text-muted-foreground">{item.body}</span>
                    <time className="mt-1 block text-[10.5px] text-muted-foreground/70" dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={item.readAt ? "Mark as unread" : "Mark as read"}
                  title={item.readAt ? "Mark as unread" : "Mark as read"}
                  onClick={() => item.readAt ? markUnread.mutate(item.id) : markRead.mutate(item.id)}
                  className="absolute right-2 top-3 grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 outline-none hover:bg-background hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 group-hover:opacity-100"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.hasNextPage ? (
          <Button variant="ghost" size="sm" className="mt-2 w-full" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
            {query.isFetchingNextPage ? <Loader2 className="animate-spin" /> : null} Load more
          </Button>
        ) : null}
      </div>
    </div>
  );
}
