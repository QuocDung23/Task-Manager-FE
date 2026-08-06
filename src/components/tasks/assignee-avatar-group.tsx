import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/users/user-avatar";

/**
 * Tối thiểu các field cần để render avatar + tooltip:
 * - `id` cho React key
 * - `name` / `email` cho tooltip fallback
 * - `avatar` cho src ảnh
 *
 * Structural-typed để chấp nhận cả `UserResponse` (full user) lẫn
 * `BoardMemberUser` (subset từ `GET /board/:id/members`).
 */
export type AssigneeLike = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
};

type AssigneeAvatarGroupProps = {
  users: AssigneeLike[];
  /** Total count, including assignees whose user record we couldn't resolve. */
  totalCount: number;
  /** Max avatars to render before showing the `+N` overflow chip. */
  max?: number;
  size?: "default" | "sm" | "lg";
};

export function AssigneeAvatarGroup({
  users,
  totalCount,
  max = 3,
  size = "default",
}: AssigneeAvatarGroupProps) {
  if (totalCount === 0) return null;

  const visible = users.slice(0, max);
  const overflow = Math.max(totalCount - visible.length, 0);
  const avatarSize: "default" | "sm" | "lg" = size;

  return (
    <div className="flex -space-x-1.5">
      {visible.map((user) => (
        <Tooltip key={user.id}>
          <TooltipTrigger asChild>
            <span
              tabIndex={-1}
              className="cursor-default outline-none **:data-[slot=avatar]:ring-1 **:data-[slot=avatar]:ring-card"
            >
              <UserAvatar
                name={user.name}
                avatar={user.avatar}
                size={avatarSize}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span className="font-medium">{user.name}</span>
          </TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`grid shrink-0 cursor-default place-items-center rounded-full bg-muted font-medium text-muted-foreground ring-1 ring-card **:data-[slot=avatar]:hidden ${
                avatarSize === "sm"
                  ? "size-6 text-[9px]"
                  : avatarSize === "lg"
                    ? "size-10 text-xs"
                    : "size-8 text-[10px]"
              }`}
            >
              +{overflow}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {overflow} more assignee{overflow === 1 ? "" : "s"}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
