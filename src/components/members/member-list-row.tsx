import { TranslateText } from "@/services/i18n";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, Shield, ShieldCheck, Trash2, User, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  SPRING_PRESS,
  enterTransitionFor,
  iconHover,
  iconTap,
  pressHover,
  pressTap,
} from "@/lib/motion";
import {
  getMemberInitials,
  getMemberRoleLabel,
  isAdminRole,
  roleNamesForScope,
  type MemberItem,
  type MemberScope,
} from "@/lib/member-roles";
import { useT } from "@/services/i18n";

interface MemberListRowProps {
  member: MemberItem;
  scope: MemberScope;
  currentUserId: string;
  isAdminViewer: boolean;
  adminCount: number;
  onChangeRole: (roleName: string) => void | Promise<unknown>;
  onRemove: () => void | Promise<unknown>;
  isRemoving?: boolean;
  isChangingRole?: boolean;
}

export function MemberListRow({
  member,
  scope,
  currentUserId,
  isAdminViewer,
  adminCount,
  onChangeRole,
  onRemove,
  isRemoving = false,
  isChangingRole = false,
}: MemberListRowProps) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const [isConfirming, setIsConfirming] = useState(false);
  const enter = enterTransitionFor(reduceMotion);

  const isSelf = member.userId === currentUserId;
  const isLastAdmin =
    (member.isOwner || isAdminRole(member.role)) && adminCount <= 1;
  const canManageRow = isAdminViewer && !member.isOwner && !isLastAdmin;
  const canDemote = isAdminViewer && !member.isOwner && !isLastAdmin;

  const roleNames = roleNamesForScope(scope);
  const roleLabel = member.isOwner ? t("member.owner") : getMemberRoleLabel(member.role);
  const isBusy = isRemoving || isChangingRole;

  const handleConfirmRemove = async () => {
    if (isBusy) return;
    try {
      await onRemove();
      setIsConfirming(false);
    } catch {
      setIsConfirming(false);
    }
  };

  const handleChangeRole = async (roleName: string) => {
    if (isBusy || roleName === member.role) return;
    try {
      await onChangeRole(roleName);
    } catch {
      /* Ignore: the mutation hook surfaces the error toast. */
    }
  };

  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { ...enter, delay: 0.04, duration: 0.4 }
      }
      className={cn(
        "group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        !isConfirming && "hover:bg-muted/70",
        isConfirming && "bg-muted/60",
      )}
    >
      <Avatar className="size-9 shrink-0">
        {member.avatar ? (
          <AvatarImage src={member.avatar} alt="" className="rounded-xl" />
        ) : null}
        <AvatarFallback className="rounded-xl bg-secondary text-[11px] font-semibold tracking-wide uppercase text-secondary-foreground">
          {getMemberInitials(member.name, member.email)}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5 truncate text-[13.5px] font-medium text-foreground">
          <span className="truncate">{member.name || t("member.unnamed")}</span>
          {isSelf && (
            <span className="shrink-0 text-[11px] font-normal text-muted-foreground/80">
              {t("member.you")}
            </span>
          )}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {member.email || t("member.noEmail")}
        </span>
      </div>

      {isConfirming ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <motion.button
            type="button"
            onClick={() => setIsConfirming(false)}
            disabled={isRemoving}
            whileHover={pressHover(reduceMotion)}
            whileTap={pressTap(reduceMotion)}
            transition={SPRING_PRESS}
            className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-medium text-muted-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="size-3.5" aria-hidden="true" />
            <TranslateText id="common.cancel" />
          </motion.button>
          <motion.button
            type="button"
            onClick={handleConfirmRemove}
            disabled={isRemoving}
            whileHover={isRemoving ? undefined : pressHover(reduceMotion)}
            whileTap={isRemoving ? undefined : pressTap(reduceMotion)}
            transition={SPRING_PRESS}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-destructive px-3 text-[12px] font-medium text-destructive-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-destructive/90 focus-visible:ring-4 focus-visible:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRemoving ? (
              <motion.span
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="size-3.5" aria-hidden="true" />
              </motion.span>
            ) : (
              <Trash2 className="size-3.5" aria-hidden="true" />
            )}
            {t("member.remove")}
          </motion.button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-1.5">
          {canManageRow ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  type="button"
                  aria-label={t("member.changeFor", { name: member.name })}
                  disabled={isChangingRole}
                  whileHover={
                    isChangingRole ? undefined : pressHover(reduceMotion)
                  }
                  whileTap={isChangingRole ? undefined : pressTap(reduceMotion)}
                  transition={SPRING_PRESS}
                  className="group inline-flex h-7 items-center gap-1 rounded-full p-0.5 outline-none transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span
                    className={cn(
                      "flex h-full min-w-14 items-center justify-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold tracking-[-0.01em] transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                      isAdminRole(member.role)
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isChangingRole ? (
                      <motion.span
                        animate={reduceMotion ? undefined : { rotate: 360 }}
                        transition={{
                          duration: 0.9,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="flex"
                      >
                        <Loader2 className="size-3.5" aria-hidden="true" />
                      </motion.span>
                    ) : isAdminRole(member.role) ? (
                      <ShieldCheck
                        className="size-3.5"
                        aria-hidden="true"
                        strokeWidth={2}
                      />
                    ) : (
                      <User
                        className="size-3.5"
                        aria-hidden="true"
                        strokeWidth={2}
                      />
                    )}
                    {roleLabel}
                  </span>
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-40 rounded-2xl border-0 bg-popover p-1.5 ring-foreground/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_14px_34px_-18px_rgba(15,23,42,0.28)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_34px_-18px_rgba(0,0,0,0.6)]"
              >
                <p className="px-2.5 py-1.5 text-[10.5px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/65">
                  <TranslateText id="member.changeRole" />
                </p>
                <DropdownMenuItem
                  onSelect={() => handleChangeRole(roleNames.admin)}
                  disabled={!canDemote && member.role !== roleNames.admin}
                  className="cursor-pointer gap-2 rounded-xl px-2 py-1.5 text-[13px] font-normal transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:bg-muted focus:text-popover-foreground! focus:**:text-popover-foreground!"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                    <ShieldCheck
                      className="size-3.5"
                      aria-hidden="true"
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="flex-1"><TranslateText id="member.admin" /></span>
                  {member.role === roleNames.admin && (
                    <Check className="size-3.5" aria-hidden="true" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => handleChangeRole(roleNames.member)}
                  disabled={!canDemote}
                  className="cursor-pointer gap-2 rounded-xl px-2 py-1.5 text-[13px] font-normal transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:bg-muted focus:text-popover-foreground! focus:**:text-popover-foreground!"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                    <User
                      className="size-3.5"
                      aria-hidden="true"
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="flex-1"><TranslateText id="member.member" /></span>
                  {member.role === roleNames.member && (
                    <Check className="size-3.5" aria-hidden="true" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium",
                member.isOwner
                  ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/15"
                  : isAdminRole(member.role)
                    ? "bg-accent/15 text-accent-foreground ring-1 ring-inset ring-accent/20 dark:text-accent"
                    : "bg-muted text-muted-foreground ring-1 ring-inset ring-foreground/8",
              )}
            >
              {member.isOwner && (
                <Shield
                  className="size-3"
                  aria-hidden="true"
                  strokeWidth={1.75}
                />
              )}
              {roleLabel}
            </span>
          )}

          {canManageRow && (
            <motion.button
              type="button"
              aria-label={t("member.removeFor", { name: member.name })}
              onClick={() => setIsConfirming(true)}
              whileHover={iconHover(reduceMotion)}
              whileTap={iconTap(reduceMotion)}
              transition={SPRING_PRESS}
              className="grid size-8 place-items-center rounded-full text-muted-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-destructive/10 hover:text-destructive focus-visible:ring-4 focus-visible:ring-destructive/15"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </motion.button>
          )}
        </div>
      )}
    </motion.li>
  );
}
