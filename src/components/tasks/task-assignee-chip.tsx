import type { BoardMemberUser } from "@/features/boards/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { UserAvatar } from "../users/user-avatar";
import { UserMinus } from "lucide-react";

type AssigneeChipProps = {
  userId: string;
  member: BoardMemberUser | undefined;
  onRemove: (userId: string) => void;
  disabled?: boolean;
};

export default function AssigneeChip({
  userId,
  member,
  onRemove,
  disabled,
}: AssigneeChipProps) {
  const label = member?.name?.trim() || member?.email || `Unknown user`;
  const subLabel =
    member && member.name && member.email && member.email !== member.name
      ? member.email
      : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card pl-1 pr-1 text-xs text-foreground/85 hover:bg-muted"
          title={member ? undefined : userId}
        >
          <UserAvatar
            name={member?.name}
            email={member?.email}
            avatar={member?.avatar}
            size="sm"
          />
          <span className="max-w-[120px] truncate">{label}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(userId);
            }}
            disabled={disabled}
            aria-label={`Remove ${label}`}
            className="ml-0.5 inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
          >
            <UserMinus className="size-3" aria-hidden="true" />
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span className="font-medium">{label}</span>
        {subLabel ? (
          <span className="ml-1 text-background/70">{subLabel}</span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
