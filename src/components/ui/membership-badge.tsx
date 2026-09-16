import { Crown, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MembershipBadgeProps {
  owned?: boolean;
  labelOwner?: string;
  labelMember?: string;
  className?: string;
}

export function MembershipBadge({
  owned,
  labelOwner = "Created by me",
  labelMember = "Shared with me",
  className,
}: MembershipBadgeProps) {
  if (typeof owned !== "boolean") return null;

  const label = owned ? labelOwner : labelMember;
  const Icon = owned ? Crown : Share2;
  const titleText = owned
    ? "You created this project/board"
    : "Shared with you";

  return (
    <span
      role="status"
      aria-label={label}
      title={titleText}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5",
        "text-[11px] font-medium leading-none ring-1 ring-inset",
        "transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        owned
          ? "bg-primary/10 text-primary ring-primary/20"
          : "bg-muted text-muted-foreground ring-border/60",
        className,
      )}
    >
      <Icon className="size-3 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}
