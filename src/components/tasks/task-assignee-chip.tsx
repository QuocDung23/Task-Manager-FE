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
            className="group/chip inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 pl-1 pr-1 text-xs font-medium text-zinc-700 transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
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
              className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              <UserMinus className="h-3 w-3" />
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