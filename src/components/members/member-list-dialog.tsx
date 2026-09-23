import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  EASE_FLUID,
  SPRING_PRESS,
  enterTransitionFor,
  iconHover,
  iconTap,
  pressHover,
  pressTap,
} from "@/lib/motion";
import {
  countAdminMembers,
  isAdminRole,
  type MemberItem,
  type MemberScope,
} from "@/lib/member-roles";
import { MemberListRow } from "./member-list-row";

const SCOPE_COPY: Record<
  MemberScope,
  { title: string; description: string; empty: string }
> = {
  project: {
    title: "Project members",
    description: "Everyone with access to this project.",
    empty: "No members in this project yet.",
  },
  board: {
    title: "Board members",
    description: "Everyone with access to this board.",
    empty: "No members on this board yet.",
  },
};

interface MemberListDialogProps {
  scope: MemberScope;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: MemberItem[];
  isLoading: boolean;
  isError?: boolean;
  currentUserId: string;
  ownerUserId?: string;
  removingMemberId?: string | null;
  changingRoleMemberId?: string | null;
  onRetry: () => void;
  onAddMember: () => void;
  onRemoveMember: (member: MemberItem) => Promise<unknown> | void;
  onChangeRole: (
    member: MemberItem,
    roleName: string,
  ) => Promise<unknown> | void;
}

export function MemberListDialog({
  scope,
  open,
  onOpenChange,
  members,
  isLoading,
  isError = false,
  currentUserId,
  ownerUserId,
  removingMemberId = null,
  changingRoleMemberId = null,
  onRetry,
  onRemoveMember,
  onChangeRole,
}: MemberListDialogProps) {
  const reduceMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedMembers = useMemo<MemberItem[]>(
    () =>
      members.map((member) => ({
        ...member,
        isOwner:
          member.isOwner ??
          Boolean(ownerUserId && member.userId === ownerUserId),
      })),
    [members, ownerUserId],
  );

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return normalizedMembers;
    return normalizedMembers.filter(
      (member) =>
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query),
    );
  }, [normalizedMembers, searchQuery]);

  const adminCount = useMemo(
    () => countAdminMembers(normalizedMembers),
    [normalizedMembers],
  );

  const viewer = normalizedMembers.find(
    (member) => member.userId === currentUserId,
  );
  const isAdminViewer = Boolean(
    viewer && (viewer.isOwner || isAdminRole(viewer.role)),
  );

  const headerEnter = enterTransitionFor(reduceMotion);
  const bodyEnter = reduceMotion
    ? { duration: 0 }
    : { duration: 0.6, delay: 0.06, ease: EASE_FLUID };

  const copy = SCOPE_COPY[scope];
  const totalMembers = normalizedMembers.length;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setSearchQuery("");
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-3xl border-0 bg-transparent p-0 ring-0 shadow-none sm:max-w-130"
      >
        <div className="rounded-3xl p-1.5">
          <div className="overflow-hidden rounded-[calc(1.5rem-0.375rem)] bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={headerEnter}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-4 px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-7"
            >
              <div className="rounded-2xl bg-primary/10 p-1.5 ring-1 ring-inset ring-primary/15">
                <div className="grid size-11 place-items-center rounded-[calc(1rem-0.375rem)] bg-card text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-16px_rgba(15,23,42,0.18)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Users
                    className="size-5"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <DialogHeader className="min-w-0 gap-1.5 pt-0.5 text-left">
                <DialogTitle className="font-heading text-[19px] font-medium leading-tight tracking-[-0.02em] text-foreground sm:text-[20px]">
                  {copy.title}
                </DialogTitle>
                <DialogDescription className="text-[13px] font-normal leading-relaxed text-muted-foreground">
                  {copy.description}{" "}
                  <span className="tabular-nums text-foreground/70">
                    {totalMembers}
                  </span>{" "}
                  {totalMembers === 1 ? "member" : "members"}.
                </DialogDescription>
              </DialogHeader>

              <DialogClose asChild>
                <motion.button
                  type="button"
                  aria-label="Close"
                  whileHover={iconHover(reduceMotion)}
                  whileTap={iconTap(reduceMotion)}
                  transition={SPRING_PRESS}
                  className="grid size-9 place-items-center rounded-full bg-muted/70 text-muted-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15"
                >
                  <X className="size-4" aria-hidden="true" />
                </motion.button>
              </DialogClose>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={bodyEnter}
              className="flex flex-col gap-4 px-5 pb-5 sm:px-7 sm:pb-7"
            >
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
                    aria-hidden="true"
                  />
                  <Input
                    type="search"
                    autoComplete="off"
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search members"
                    className="h-12 rounded-2xl border border-foreground/8 bg-background/65 pl-10 pr-4 text-[13.5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground/65 hover:bg-background focus-visible:border-accent/40 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-accent/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  />
                </div>
              </div>

              {isLoading ? (
                <MembersStatus>
                  <Loader2
                    className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  <span>Loading members...</span>
                </MembersStatus>
              ) : isError && normalizedMembers.length === 0 ? (
                <MembersStatus hasError>
                  <AlertCircle
                    className="size-4 text-destructive"
                    aria-hidden="true"
                  />
                  <span>Could not load members.</span>
                  <motion.button
                    type="button"
                    onClick={onRetry}
                    whileHover={pressHover(reduceMotion)}
                    whileTap={pressTap(reduceMotion)}
                    transition={SPRING_PRESS}
                    className="ml-1 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[12px] font-medium text-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/70 focus-visible:ring-4 focus-visible:ring-accent/15"
                  >
                    <RefreshCw className="size-3.5" aria-hidden="true" />
                    Retry
                  </motion.button>
                </MembersStatus>
              ) : filteredMembers.length === 0 ? (
                <MembersStatus>
                  {searchQuery.trim()
                    ? "No members match your search."
                    : copy.empty}
                </MembersStatus>
              ) : (
                <ul
                  role="list"
                  aria-label="Member list"
                  className="flex max-h-80 flex-col gap-0.5 overflow-y-auto rounded-2xl border border-foreground/8 bg-card p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  {filteredMembers.map((member) => (
                    <MemberListRow
                      key={member.membershipId}
                      member={member}
                      scope={scope}
                      currentUserId={currentUserId}
                      isAdminViewer={isAdminViewer}
                      adminCount={adminCount}
                      onChangeRole={(roleName) =>
                        onChangeRole(member, roleName)
                      }
                      onRemove={() => onRemoveMember(member)}
                      isRemoving={removingMemberId === member.membershipId}
                      isChangingRole={
                        changingRoleMemberId === member.membershipId
                      }
                    />
                  ))}
                </ul>
              )}
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MembersStatus({
  children,
  hasError = false,
}: {
  children: React.ReactNode;
  hasError?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/30 px-3 py-8 text-center text-xs",
        hasError
          ? "border-destructive/25 text-destructive/90"
          : "border-foreground/10 text-muted-foreground",
      )}
    >
      {children}
    </div>
  );
}
