import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
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

  return (
    <AvatarGroup className="shrink-0">
      {visible.map((user) => (
        <Tooltip key={user.id}>
          <TooltipTrigger asChild>
            <span tabIndex={-1} className="cursor-default outline-none">
              <UserAvatar name={user.name} avatar={user.avatar} size={size} />
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
            <AvatarGroupCount className="cursor-default">
              +{overflow}
            </AvatarGroupCount>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {overflow} more assignee{overflow === 1 ? "" : "s"}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </AvatarGroup>
  );
}
