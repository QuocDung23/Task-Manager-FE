import { PencilIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import type { ProfileUser } from "./profile-info";

interface ProfileHeaderProps {
  user: ProfileUser;
  edit: boolean;
  isLoading: boolean;
  onEdit: () => void;
}

export function ProfileHeader({ user, edit, isLoading, onEdit }: ProfileHeaderProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {/* Cover gradient */}
      <div className="relative h-32 bg-linear-to-br from-zinc-300 via-zinc-200 to-zinc-100 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900" />

      {/* Avatar + name block */}
      <div className="relative px-6 pb-6">
        <div className="-mt-20 mb-4 flex items-end justify-between">
          <div className="relative">
            <Avatar className="ring-4 ring-background size-35">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-3xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          {!edit && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="mb-1.5 gap-1.5"
            >
              <PencilIcon className="size-3.5" />
              Edit
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold leading-tight text-foreground">
              {user.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </>
        )}
      </div>
    </>
  );
}
