import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { TypedSocket } from "../socket";
import type { ServerToClientEvents } from "../contracts/realtime-events";
import type {
  TaskActivityListResponse,
} from "@/features/task-activities/types";
import { taskActivityKeys } from "@/features/task-activities/utils/task-activity-query-keys";

export function registerTaskActivityEventHandlers(
  socket: TypedSocket,
  queryClient: QueryClient,
): () => void {
  const handleCreated: ServerToClientEvents["task:activity_created"] = (payload) => {
    const activity = payload.data.activity;
    queryClient.setQueryData<InfiniteData<TaskActivityListResponse>>(
      taskActivityKeys.list(activity.taskId),
      (current) => {
        if (!current) return current;
        if (
          current.pages.some((page) =>
            page.data.items.some((item) => item.id === activity.id),
          )
        ) return current;
        const [first, ...rest] = current.pages;
        if (!first) return current;
        return {
          ...current,
          pages: [
            { ...first, data: { ...first.data, items: [activity, ...first.data.items] } },
            ...rest,
          ],
        };
      },
    );
  };
  socket.on("task:activity_created", handleCreated);
  return () => socket.off("task:activity_created", handleCreated);
}
