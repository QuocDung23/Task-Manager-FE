import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { getAvatarUrl } from "@/utils/getAvatarUrl";
import { getInitials } from "@/utils/getInitials";

type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  size?: "default" | "sm" | "lg";
  className?: string;
};

export function UserAvatar({
  name,
  email,
  avatar,
  size = "default",
  className,
}: UserAvatarProps) {
  const src = getAvatarUrl(avatar ?? undefined);
  const fallbackSource = name?.trim() || email || "";
  return (
    <Avatar size={size} className={className}>
      {src ? <AvatarImage src={src} alt={fallbackSource} /> : null}
      <AvatarFallback className="bg-muted text-[10px] font-semibold uppercase text-muted-foreground group-data-[size=sm]/avatar:text-[9px]">
        {getInitials(fallbackSource)}
      </AvatarFallback>
    </Avatar>
  );
}