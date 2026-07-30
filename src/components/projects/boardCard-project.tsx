import { ClipboardList, FolderOpen, Users } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";

import type { BoardMemberUser } from "@/features/boards/types";

const MAX_AVATARS = 3;

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

interface BoardCardProps {
  name: string;
  description?: string;
  members?: BoardMemberUser[];
  listCount?: number;
  isListCountLoading?: boolean;
}

export function BoardCard({
  name,
  description,
  members = [],
  listCount,
  isListCountLoading = false,
}: BoardCardProps) {
  const totalMembers = members.length;
  const visibleMembers = members.slice(0, MAX_AVATARS);
  const remainingCount = Math.max(totalMembers - visibleMembers.length, 0);
  const lists = listCount ?? 0;

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-start gap-3.5">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10">
          <FolderOpen
            className="size-5"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-heading text-[15.5px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
            {name}
          </h3>
          {description ? (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground/85">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5">
          <ClipboardList
            className="size-3.5 shrink-0 text-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="tabular-nums text-[12.5px] font-semibold leading-none text-foreground">
            {isListCountLoading ? "…" : lists}
          </span>
          <span className="text-[11.5px] font-medium leading-none text-muted-foreground/80">
            {lists === 1 ? "list" : "lists"}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-5">
        <div className="h-px w-full bg-border/60" aria-hidden="true" />

        <div className="mt-4 flex items-center justify-between gap-3">
          {totalMembers > 0 ? (
            <AvatarGroup className="flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-card">
              {visibleMembers.map((member) => (
                <Avatar
                  key={member.id}
                  size="sm"
                  className="size-7 text-[10px]"
                  title={member.name}
                >
                  {member.avatar ? (
                    <AvatarImage src={member.avatar} alt={member.name} />
                  ) : null}
                  <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {remainingCount > 0 ? (
                <Avatar
                  size="sm"
                  className="size-7"
                  aria-label={`${remainingCount} more member${remainingCount === 1 ? "" : "s"}`}
                >
                  <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
                    +{remainingCount}
                  </AvatarFallback>
                </Avatar>
              ) : null}
            </AvatarGroup>
          ) : (
            <div className="inline-flex items-center gap-2 text-[12px] text-muted-foreground/70">
              <span className="grid size-7 place-items-center rounded-full bg-muted/60 ring-1 ring-inset ring-border/60">
                <Users
                  className="size-3.5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </span>
            </div>
          )}

          <div className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5">
            <Users
              className="size-3.5 shrink-0 text-foreground"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="text-[12.5px] font-semibold leading-none text-foreground">
              {totalMembers}
            </span>
            <span className="text-[11.5px] font-medium leading-none text-muted-foreground/80">
              {totalMembers === 1 ? "member" : "members"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
