import { ChevronsUpDown, LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useCurrentUser } from "@/features/users/hooks/useCurrentUser";
import { getInitials } from "@/utils/getInitials";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { getAvatarUrl } from "@/utils/getAvatarUrl";
import { ViewProfileUser } from "./profile-user";

export function SidebarUser() {
  const { data: userRes, isLoading } = useCurrentUser();
  const { mutate: logout } = useLogout();

  const user = userRes?.data;

  if (isLoading) {
    return (
      <div className="flex w-full items-center gap-2 rounded-md p-2">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex flex-col gap-1 flex-1">
          <div className="h-3 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-2 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }
  const displayUser = user || {
    name: "User",
    email: "Loading...",
    avatar: undefined,
  };
  const avatarUrl = getAvatarUrl(displayUser.avatar);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md p-2 text-left outline-none transition-colors hover:bg-zinc-100 data-[state=open]:bg-zinc-100 dark:hover:bg-zinc-800 dark:data-[state=open]:bg-zinc-800 cursor-pointer">
        <Avatar className="h-8 w-8 rounded-lg">
          <AvatarImage src={avatarUrl} alt={displayUser.name} />
          <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
            {getInitials(displayUser.name)}
          </AvatarFallback>
        </Avatar>

        <div className="grid flex-1 text-sm leading-tight">
          <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
            {displayUser.name}
          </span>
          <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {displayUser.email}
          </span>
        </div>

        <ChevronsUpDown className="ml-auto h-4 w-4 text-zinc-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-56 rounded-lg"
        align="end"
        side="right"
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <ViewProfileUser>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
          </ViewProfileUser>
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Setting</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
