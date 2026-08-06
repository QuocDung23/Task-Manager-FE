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
        className={`flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-1.5 ${
          isAssigned ? "bg-muted/60" : "hover:bg-muted/70"
        }`}
      >
        <input
          type="checkbox"
          checked={isAssigned || isSelected}
          disabled={isAssigned || disabled}
          onChange={onToggle}
          className="size-3.5 shrink-0 cursor-pointer rounded border-input text-primary accent-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <UserAvatar name={member.name} avatar={member.avatar} size="sm" />
        <span className="min-w-0 flex-1 truncate text-xs text-foreground/85">
          {member.name}
        </span>
        {isAssigned ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
            <Check className="size-3" strokeWidth={2.25} aria-hidden="true" />
            Assigned
          </span>
        ) : null}
      </label>
    </li>
  );
}
