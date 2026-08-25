import { Bot } from "lucide-react";
import { UserAvatar } from "@/components/users/user-avatar";
import type { TaskActivity } from "@/features/task-activities/types";
import { presentTaskActivity } from "@/features/task-activities/utils/task-activity-presenter";
import { formatDateTime } from "@/utils/formatDateTime";

export function TaskActivityItem({ activity }: { activity: TaskActivity }) {
  const presentation = presentTaskActivity(activity);

  return (
    <div className="flex gap-2.5 py-1">
      {activity.actor ? (
        <UserAvatar
          name={activity.actor.name}
          avatar={activity.actor.avatar}
          size="sm"
        />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <Bot className="size-4" />
        </span>
      )}
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[12.5px] leading-5 text-muted-foreground">
          {presentation.text}
        </p>
        {presentation.detail ? (
          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground/80">
            {presentation.detail}
          </p>
        ) : null}
        <time
          className="mt-1 block text-[10.5px] text-muted-foreground/70"
          dateTime={activity.createdAt}
        >
          {formatDateTime(activity.createdAt)}
        </time>
      </div>
    </div>
  );
}
