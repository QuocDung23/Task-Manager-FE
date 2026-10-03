import { Crown, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/services/i18n";

interface MembershipBadgeProps {
  owned?: boolean;
  labelOwner?: string;
  labelMember?: string;
  className?: string;
}

export function MembershipBadge({
  owned,
  labelOwner,
  labelMember,
  className,
}: MembershipBadgeProps) {
  const t = useT();
  if (typeof owned !== "boolean") return null;

  const label = owned ? labelOwner ?? t("member.owner") : labelMember ?? t("member.member");
  const Icon = owned ? Crown : Share2;
  const titleText = owned
    ? t("member.createdByYou")
    : t("member.sharedWithYou");

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
