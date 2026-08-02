import { useReducedMotion, motion } from "framer-motion";
import { ListPlus, Trash, X } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteList } from "@/features/lists/hooks/useDeleteList";
import type { ListResponse } from "@/features/lists/types";
import {
  EASE_FLUID,
  SPRING_PRESS,
  enterTransitionFor,
  iconHover,
  iconTap,
  pressHover,
  pressTap,
} from "@/lib/motion";

interface DeleteListDialogProps {
  list: ListResponse;
  boardId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteListDialog({
  list,
  boardId,
  open,
  onOpenChange,
}: DeleteListDialogProps) {
  const reduceMotion = useReducedMotion();
  const { mutate: deleteList, isPending } = useDeleteList(boardId);

  const handleConfirm = () => {
    deleteList(list.id, {
      onSuccess: () => {
        onOpenChange?.(false);
      },
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) onOpenChange?.(nextOpen);
  };

  const enterTransition = enterTransitionFor(reduceMotion);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-3xl border-0 bg-transparent p-0 ring-0 shadow-none sm:max-w-110"
      >
        <div className="rounded-3xl p-1.5">
          <div className="overflow-hidden rounded-[calc(1.5rem-0.375rem)] bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_32px_80px_-32px_rgba(15,23,42,0.35)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_32px_80px_-32px_rgba(0,0,0,0.65)]">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={enterTransition}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-4 px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-7"
            >
              <div className="rounded-2xl bg-destructive/10 p-1.5 ring-1 ring-inset ring-destructive/15">
                <div className="grid size-11 place-items-center rounded-[calc(1rem-0.375rem)] bg-card text-destructive shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-16px_rgba(15,23,42,0.18)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <ListPlus
                    className="size-5"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <DialogHeader className="min-w-0 gap-1.5 pt-0.5 text-left">
                <DialogTitle className="font-heading text-[19px] font-medium leading-tight tracking-[-0.02em] text-foreground sm:text-[20px]">
                  Delete list
                </DialogTitle>
                <DialogDescription className="max-w-[36ch] text-[13px] font-normal leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground/85">
                    {list.name}
                  </span>{" "}
                  will be removed along with every task inside it. This cannot
                  be undone.
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
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.6, delay: 0.06, ease: EASE_FLUID }
              }
              className="flex flex-col gap-5 px-5 pb-5 sm:px-7 sm:pb-7"
            >
              <div className="rounded-2xl border border-destructive/15 bg-destructive/4 px-4 py-3 text-[12.5px] leading-relaxed text-destructive/90 dark:border-destructive/20 dark:bg-destructive/6">
                Tasks in this list are not recoverable after deletion.
              </div>

              <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end">
                <motion.button
                  type="button"
                  disabled={isPending}
                  onClick={() => onOpenChange?.(false)}
                  whileHover={pressHover(reduceMotion)}
                  whileTap={pressTap(reduceMotion)}
                  transition={SPRING_PRESS}
                  className="h-11 whitespace-nowrap rounded-full px-5 text-[13px] font-medium text-muted-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/70 hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </motion.button>

                <motion.button
                  type="button"
                  disabled={isPending}
                  aria-live="polite"
                  onClick={handleConfirm}
                  whileHover={
                    isPending ? undefined : pressHover(reduceMotion)
                  }
                  whileTap={isPending ? undefined : pressTap(reduceMotion)}
                  transition={SPRING_PRESS}
                  className="group inline-flex h-11 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-destructive pl-5 pr-1.5 text-[13px] font-medium text-white shadow-[0_10px_30px_-16px_color-mix(in_oklab,var(--destructive)_70%,transparent)] outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-destructive/90 focus-visible:ring-4 focus-visible:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-37.5"
                >
                  <span>{isPending ? "Deleting" : "Delete list"}</span>
                  <span className="grid size-8 place-items-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:scale-105">
                    <Trash className="size-3.5" strokeWidth={2} aria-hidden="true" />
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
