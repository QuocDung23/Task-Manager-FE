import { useDeferredValue, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Search,
  UserPlus,
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
import { useUsers } from "@/features/users/hooks/useUsers";
import { useAddMemberProject } from "@/features/projects/hooks/useAddMemberProject";
import type { UserResponse } from "@/features/users/types";

interface AddMemberProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DialogAddMemberProject({
  projectId,
  open,
  onOpenChange,
}: AddMemberProps) {
  const reduceMotion = useReducedMotion();
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);

  const deferredEmail = useDeferredValue(searchEmail);
  const trimmedEmail = deferredEmail.trim();
  const hasQuery = trimmedEmail.length > 0;

  const { data: usersResponse, isLoading: isLoadingUsers } = useUsers(
    hasQuery ? trimmedEmail : undefined,
  );
  const users = useMemo(() => usersResponse?.data ?? [], [usersResponse?.data]);

  const { mutate: addMember, isPending } = useAddMemberProject();

  const headerEnter = enterTransitionFor(reduceMotion);
  const bodyEnter = reduceMotion
    ? { duration: 0 }
    : { duration: 0.6, delay: 0.06, ease: EASE_FLUID };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    if (!nextOpen) {
      setSearchEmail("");
      setSelectedUser(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSelect = (user: UserResponse) => {
    setSelectedUser((current) =>
      current?.id === user.id ? null : user,
    );
  };

  const handleAdd = () => {
    if (!selectedUser) return;
    addMember(
      { projectId, data: { userId: selectedUser.id } },
      { onSuccess: () => handleClose(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
                  <UserPlus
                    className="size-5"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <DialogHeader className="min-w-0 gap-1.5 pt-0.5 text-left">
                <DialogTitle className="font-heading text-[19px] font-medium leading-tight tracking-[-0.02em] text-foreground sm:text-[20px]">
                  Add member
                </DialogTitle>
                <DialogDescription className="max-w-[34ch] text-[13px] font-normal leading-relaxed text-muted-foreground">
                  Search by email to invite a teammate to this project.
                </DialogDescription>
              </DialogHeader>

              <DialogClose asChild>
                <motion.button
                  type="button"
                  aria-label="Close"
                  disabled={isPending}
                  whileHover={iconHover(reduceMotion)}
                  whileTap={iconTap(reduceMotion)}
                  transition={SPRING_PRESS}
                  className="grid size-9 place-items-center rounded-full bg-muted/70 text-muted-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
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
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
                  aria-hidden
                />
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  placeholder="Search by email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  aria-label="Search user by email"
                  className="h-12 rounded-2xl border border-foreground/8 bg-background/65 pl-10 pr-4 text-[13.5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground/65 hover:bg-background focus-visible:border-accent/40 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-accent/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                />
              </div>

              <SearchResults
                users={users}
                isLoading={isLoadingUsers}
                hasQuery={hasQuery}
                onSelect={handleSelect}
                selectedUserId={selectedUser?.id ?? null}
              />

              <div className="mt-2 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end">
                <motion.button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleClose(false)}
                  whileHover={pressHover(reduceMotion)}
                  whileTap={pressTap(reduceMotion)}
                  transition={SPRING_PRESS}
                  className="h-11 whitespace-nowrap rounded-full px-5 text-[13px] font-medium text-muted-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/70 hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleAdd}
                  disabled={!selectedUser || isPending}
                  aria-live="polite"
                  whileHover={
                    !selectedUser || isPending
                      ? undefined
                      : pressHover(reduceMotion)
                  }
                  whileTap={
                    !selectedUser || isPending
                      ? undefined
                      : pressTap(reduceMotion)
                  }
                  transition={SPRING_PRESS}
                  className="group inline-flex h-11 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-primary pl-5 pr-1.5 text-[13px] font-medium text-primary-foreground shadow-[0_10px_30px_-16px_color-mix(in_oklab,var(--primary)_70%,transparent)] outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-38.5"
                >
                  <span>{isPending ? "Adding" : "Add member"}</span>
                  <span className="grid size-8 place-items-center rounded-full bg-primary-foreground/12 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:scale-105">
                    {isPending ? (
                      <motion.span
                        animate={
                          reduceMotion
                            ? undefined
                            : { rotate: 360, opacity: [0.6, 1] }
                        }
                        transition={{
                          duration: 0.9,
                          repeat: Infinity,
                          ease: EASE_FLUID,
                        }}
                      >
                        <Loader2 className="size-4" aria-hidden="true" />
                      </motion.span>
                    ) : (
                      <ArrowRight
                        className="size-4"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SearchResultsProps {
  users: UserResponse[];
  isLoading: boolean;
  hasQuery: boolean;
  onSelect: (user: UserResponse) => void;
  selectedUserId: string | null;
}

function SearchResults({
  users,
  isLoading,
  hasQuery,
  onSelect,
  selectedUserId,
}: SearchResultsProps) {
  if (!hasQuery) {
    return (
      <ResultsHint>
        Start typing an email to find a teammate to add.
      </ResultsHint>
    );
  }

  if (isLoading) {
    return (
      <ResultsStatus>
        <Loader2
          className="size-4 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
        <span>Searching users…</span>
      </ResultsStatus>
    );
  }

  if (users.length === 0) {
    return <ResultsHint>No active users match this email.</ResultsHint>;
  }

  return (
    <ul
      role="listbox"
      aria-label="Search results"
      className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-2xl border border-foreground/8 bg-background/65 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      {users.map((user) => {
        const isSelected = selectedUserId === user.id;
        return (
          <li key={user.id} role="option" aria-selected={isSelected}>
            <button
              type="button"
              onClick={() => onSelect(user)}
              aria-pressed={isSelected}
              className={cn(
                "group flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                isSelected
                  ? "bg-accent text-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                  : "hover:bg-muted/70",
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <Avatar
                  name={user.name}
                  email={user.email}
                  className={cn(
                    "size-9 rounded-[calc(0.75rem-0.25rem)] text-[12px]",
                    isSelected
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-secondary text-secondary-foreground",
                  )}
                />
                <span className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      "truncate text-[13.5px] font-medium",
                      isSelected ? "text-accent-foreground" : "text-foreground",
                    )}
                  >
                    {user.name || "Unnamed user"}
                  </span>
                  <span
                    className={cn(
                      "truncate text-xs",
                      isSelected
                        ? "text-accent-foreground/80"
                        : "text-muted-foreground",
                    )}
                  >
                    {user.email || "No email on file"}
                  </span>
                </span>
              </span>
              <CheckCircle2
                className={cn(
                  "size-4 shrink-0 transition-opacity",
                  isSelected
                    ? "opacity-100"
                    : "text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
                )}
                aria-hidden="true"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ResultsHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-foreground/10 bg-muted/30 px-3 py-8 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function ResultsStatus({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-foreground/10 bg-muted/30 px-3 py-8 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  className?: string;
}

function Avatar({ name, email, className }: AvatarProps) {
  const initials = deriveInitials(name, email);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      {initials}
    </span>
  );
}

function deriveInitials(name?: string | null, email?: string | null): string {
  const source = (name && name.trim()) || (email && email.trim()) || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}
