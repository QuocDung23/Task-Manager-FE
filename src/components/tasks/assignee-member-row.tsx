import { Check } from "lucide-react";
import { UserAvatar } from "../users/user-avatar";
import type { BoardMemberUser } from "@/features/boards/types";

type MemberRowProps = {
  member: BoardMemberUser;
  isAssigned: boolean;
  isSelected: boolean;
  disabled: boolean;
  onToggle: () => void;
};

export default function AssigneeMemberRow({
  member,
  isAssigned,
  isSelected,
  disabled,
  onToggle,
}: MemberRowProps) {
  return (
    <li>
      <label
        className={`flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-2 transition-colors ${
          isAssigned
            ? "bg-zinc-50/60 dark:bg-zinc-900/60"
            : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
        }`}
      >
        <input
          type="checkbox"
          checked={isAssigned || isSelected}
          disabled={isAssigned || disabled}
          onChange={onToggle}
          className="size-4 shrink-0 cursor-pointer rounded border-zinc-300 text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700"
        />
        <UserAvatar name={member.name} avatar={member.avatar} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">
            {member.name}
          </p>
        </div>
        {isAssigned ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
            <Check className="h-3 w-3" />
            Assigned
          </span>
        ) : null}
      </label>
    </li>
  );
}
