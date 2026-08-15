"use client";

import { useState } from "react";
import {
  ArrowRight,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useTags } from "@/features/tags/hooks/useTags";
import { useDeleteTag } from "@/features/tags/hooks/useDeleteTag";
import type { TagResponse } from "@/features/tags/types";
import {
  EASE_FLUID,
  SPRING_PRESS,
  enterTransitionFor,
  iconHover,
  iconTap,
  pressHover,
  pressHoverStrong,
  pressTap,
  pressTapStrong,
} from "@/lib/motion";
import { normalizeColor } from "./tag-utils";
import { TagEditorDialog } from "./tag-editor-dialog";

type BoardTagsManagerDialogProps = {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};


export function BoardTagsManagerDialog({
  boardId,
  open,
  onOpenChange,
}: BoardTagsManagerDialogProps) {
  const reduceMotion = useReducedMotion();
  const { data: tags = [], isLoading } = useTags(boardId);
  const deleteTag = useDeleteTag(boardId);

  const [editingTag, setEditingTag] = useState<TagResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteConfirmTag, setDeleteConfirmTag] = useState<TagResponse | null>(
    null,
  );

  const activeTags: TagResponse[] = tags.filter(
    (tag: TagResponse) => tag.status === "ACTIVE",
  );
  const sortedTags = [...activeTags].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const handleDeleteConfirm = () => {
    if (!deleteConfirmTag) return;

    deleteTag.mutate(deleteConfirmTag.id, {
      onSuccess: () => setDeleteConfirmTag(null),
    });
  };

  const enterTransition = enterTransitionFor(reduceMotion);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!deleteTag.isPending) onOpenChange(nextOpen);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="gap-0 rounded-3xl border-0 bg-transparent p-0 ring-0 shadow-none sm:max-w-130"
        >
          <div className="rounded-3xl p-1.5">
            <div >
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={enterTransition}
                className="grid grid-cols-[auto_1fr_auto] items-start gap-4 px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-7"
              >
                <div className="rounded-2xl bg-primary/10 p-1.5 ring-1 ring-inset ring-primary/15">
                  <div className="grid size-11 place-items-center rounded-[calc(1rem-0.375rem)] bg-card text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-16px_rgba(15,23,42,0.18)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <Tag className="size-5" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                </div>

                <DialogHeader className="min-w-0 gap-1.5 pt-0.5 text-left">
                  <DialogTitle className="font-heading text-[19px] font-medium leading-tight tracking-[-0.02em] text-foreground sm:text-[20px]">
                    Manage labels
                  </DialogTitle>
                  <DialogDescription className="max-w-[34ch] text-[13px] font-normal leading-relaxed text-muted-foreground">
                    Keep this board easy to scan with a small set of labels.
                  </DialogDescription>
                </DialogHeader>

                <DialogClose asChild>
                  <motion.button
                    type="button"
                    aria-label="Close"
                    disabled={deleteTag.isPending}
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
                className="px-5 pb-5 sm:px-7 sm:pb-7"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-[12.5px] font-medium text-muted-foreground">
                    {sortedTags.length === 1 ? "1 active label" : `${sortedTags.length} active labels`}
                  </p>
                  <span className="rounded-lg bg-muted/70 px-2.5 py-1.5 tabular-nums text-[11.5px] font-semibold text-foreground">
                    {sortedTags.length}
                  </span>
                </div>

                <div className="max-h-[min(52vh,26rem)] overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                  {isLoading ? (
                    <div className="space-y-2">
                      {[0, 1, 2].map((item) => (
                        <div
                          key={item}
                          className={`flex items-center gap-3 px-3 py-2.5 `}
                        >
                          <Skeleton className="size-8 rounded-xl" />
                          <Skeleton className="h-3.5 w-32" />
                          <Skeleton className="ml-auto size-8 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : sortedTags.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-background/65 px-6 py-12 text-center">
                      <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Tag className="size-5" strokeWidth={1.75} aria-hidden="true" />
                      </div>
                      <p className="mt-4 font-heading text-[17px] font-semibold leading-tight text-foreground">
                        No labels yet
                      </p>
                      <p className="mt-2 max-w-[30ch] text-[13.5px] leading-relaxed text-muted-foreground">
                        Create your first label to organize tasks on this board.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {sortedTags.map((tag) => (
                        <li
                          key={tag.id}
                          className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-[background-color,border-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-border/70 hover:bg-foreground/4"
                        >
                          <span
                            className="size-8 shrink-0 rounded-xl ring-1 ring-inset ring-foreground/10"
                            style={{ backgroundColor: normalizeColor(tag.color) }}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-foreground">
                            {tag.name}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label={`Actions for ${tag.name}`}
                                className="group/action grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-foreground/6 hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15 data-[state=open]:bg-foreground/6 data-[state=open]:text-foreground"
                              >
                                <MoreHorizontal className="size-4" strokeWidth={1.75} aria-hidden="true" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={8} className="w-44 rounded-2xl p-1.5">
                              <DropdownMenuItem
                                onClick={() => setEditingTag(tag)}
                                className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-normal"
                              >
                                <span className="grid size-6 place-items-center rounded-full bg-foreground/4 text-foreground/80">
                                  <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                                </span>
                                Edit label
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteConfirmTag(tag)}
                                className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-normal"
                              >
                                <span className="grid size-6 place-items-center rounded-full bg-destructive/10 text-destructive">
                                  <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                                </span>
                                Delete label
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-5 flex flex-col-reverse gap-2.5 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[11.5px] text-muted-foreground/75">
                    Labels are shared across this board.
                  </span>
                  <motion.button
                    type="button"
                    onClick={() => setCreating(true)}
                    whileHover={pressHoverStrong(reduceMotion)}
                    whileTap={pressTapStrong(reduceMotion)}
                    transition={SPRING_PRESS}
                    className="group inline-flex h-11 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-primary pl-5 pr-1.5 text-[13px] font-medium text-primary-foreground shadow-[0_10px_30px_-16px_color-mix(in_oklab,var(--primary)_70%,transparent)] outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-primary/20"
                  >
                    <span>Create label</span>
                    <span className="grid size-8 place-items-center rounded-full bg-primary-foreground/12 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:scale-105">
                      <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
                    </span>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {editingTag && (
        <TagEditorDialog
          key={editingTag.id}
          boardId={boardId}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setEditingTag(null);
          }}
          tag={editingTag}
        />
      )}

      {creating && (
        <TagEditorDialog
          key="create-label"
          boardId={boardId}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setCreating(false);
          }}
        />
      )}

      {deleteConfirmTag && (
        <Dialog
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen && !deleteTag.isPending) setDeleteConfirmTag(null);
          }}
        >
          <DialogContent
            showCloseButton={false}
            className="gap-0 rounded-3xl border-0 bg-transparent p-0 ring-0 shadow-none sm:max-w-105"
          >
            <div className="rounded-3xl p-1.5">
              <div >
                <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4 px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-7">
                  <div className="rounded-2xl bg-destructive/10 p-1.5 ring-1 ring-inset ring-destructive/15">
                    <div className="grid size-11 place-items-center rounded-[calc(1rem-0.375rem)] bg-card text-destructive shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-16px_rgba(15,23,42,0.18)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      <Trash2 className="size-5" strokeWidth={1.75} aria-hidden="true" />
                    </div>
                  </div>
                  <DialogHeader className="min-w-0 gap-1.5 pt-0.5 text-left">
                    <DialogTitle className="font-heading text-[19px] font-medium leading-tight tracking-[-0.02em] text-foreground">
                      Delete label
                    </DialogTitle>
                    <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
                      This removes the label from every task on this board.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogClose asChild>
                    <motion.button
                      type="button"
                      aria-label="Close"
                      disabled={deleteTag.isPending}
                      whileHover={iconHover(reduceMotion)}
                      whileTap={iconTap(reduceMotion)}
                      transition={SPRING_PRESS}
                      className="grid size-9 place-items-center rounded-full bg-muted/70 text-muted-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </motion.button>
                  </DialogClose>
                </div>

                <div className="px-5 pb-5 sm:px-7 sm:pb-7">
                  <div className="flex items-center gap-3 rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3">
                    <span
                      className="size-8 shrink-0 rounded-xl ring-1 ring-inset ring-foreground/10"
                      style={{ backgroundColor: normalizeColor(deleteConfirmTag.color) }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 truncate text-[13.5px] font-medium text-foreground">
                      {deleteConfirmTag.name}
                    </span>
                  </div>

                  <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                    <motion.button
                      type="button"
                      disabled={deleteTag.isPending}
                      onClick={() => setDeleteConfirmTag(null)}
                      whileHover={pressHover(reduceMotion)}
                      whileTap={pressTap(reduceMotion)}
                      transition={SPRING_PRESS}
                      className="h-11 whitespace-nowrap rounded-full px-5 text-[13px] font-medium text-muted-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/70 hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="button"
                      disabled={deleteTag.isPending}
                      onClick={handleDeleteConfirm}
                      whileHover={deleteTag.isPending ? undefined : pressHover(reduceMotion)}
                      whileTap={deleteTag.isPending ? undefined : pressTap(reduceMotion)}
                      transition={SPRING_PRESS}
                      className="group inline-flex h-11 min-w-32 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-destructive px-5 text-[13px] font-medium text-white shadow-[0_10px_30px_-16px_color-mix(in_oklab,var(--destructive)_70%,transparent)] outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-destructive/90 focus-visible:ring-4 focus-visible:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>{deleteTag.isPending ? "Deleting" : "Delete label"}</span>
                      <span className="grid size-8 place-items-center rounded-full bg-white/12">
                        {deleteTag.isPending ? (
                          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                        ) : (
                          <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
                        )}
                      </span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
