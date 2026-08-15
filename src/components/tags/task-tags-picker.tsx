"use client";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Plus, Search, Tag, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTags } from "@/features/tags/hooks/useTags";
import { useReplaceTaskTags } from "@/features/tasks/hooks/useTaskTags";
import { useTaskDetail } from "@/components/tasks/use-task-detail";
import type { TaskResponse } from "@/features/tasks/types";
import type { TagResponse } from "@/features/tags/types";
import {
  normalizeColor,
  getContrastColor,
} from "./tag-utils";
import { TagEditorDialog } from "./tag-editor-dialog";

type TaskTagsPickerProps = {
  task: TaskResponse;
  isUpdating: boolean;
  onTaskUpdated: (task: TaskResponse) => void;
};

type Mode = "picker" | "create";

export function TaskTagsPicker({
  task,
  isUpdating,
  onTaskUpdated,
}: TaskTagsPickerProps) {
  const { boardId } = useTaskDetail();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [draftTagIds, setDraftTagIds] = useState<Set<string>>(
    () => new Set(task.tags?.map((t) => t.id) ?? []),
  );
  const baselineTagIdsRef = useRef<string[]>(task.tags?.map((tag) => tag.id) ?? []);
  const [hasRemoteConflict, setHasRemoteConflict] = useState(false);
  const [dialogMode, setDialogMode] = useState<Mode>("picker");
  const deferredSearch = useDeferredValue(searchQuery);

  const { data: availableTags = [], isLoading } = useTags(boardId, {
    name: deferredSearch || undefined,
  });

  const { mutate: replaceTags, isPending: isReplacing } = useReplaceTaskTags();

  // Keep an unsaved draft intact when a canonical socket snapshot arrives.
  // A clean picker follows the snapshot immediately; a dirty picker asks the
  // user to reload before it can send a replace-all command.
  useEffect(() => {
    const nextIds = task.tags?.map((tag) => tag.id) ?? [];
    const baselineIds = baselineTagIdsRef.current;
    const hasCanonicalChanged =
      nextIds.length !== baselineIds.length || nextIds.some((id) => !baselineIds.includes(id));
    const hasDraftChanges =
      draftTagIds.size !== baselineIds.length ||
      Array.from(draftTagIds).some((id) => !baselineIds.includes(id));

    if (!open || !hasDraftChanges) {
      baselineTagIdsRef.current = nextIds;
      const draftIds = Array.from(draftTagIds);
      const isDraftEqual =
        draftIds.length === nextIds.length && draftIds.every((id) => nextIds.includes(id));
      // The draft is a local mirror of server state only while clean.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!isDraftEqual) setDraftTagIds(new Set(nextIds));
      setHasRemoteConflict(false);
    } else if (hasCanonicalChanged) {
      setHasRemoteConflict(true);
    }
  }, [draftTagIds, open, task.tags]);

  const activeTags = useMemo(
    (): TagResponse[] =>
      availableTags.filter((tag: TagResponse) => tag.status === "ACTIVE"),
    [availableTags],
  );

  const selectedTags = useMemo(() => {
    const tagMap = new Map(activeTags.map((t) => [t.id, t]));
    return Array.from(draftTagIds)
      .map((id) => tagMap.get(id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  }, [activeTags, draftTagIds]);

  const unselectedTags = useMemo(
    () => activeTags.filter((tag) => !draftTagIds.has(tag.id)),
    [activeTags, draftTagIds],
  );

  const displayTags = task.tags ?? [];
  const committedCount = displayTags.length;
  const draftCount = draftTagIds.size;
  const committedTagCountLabel =
    committedCount === 0
      ? "No labels"
      : `${committedCount} label${committedCount > 1 ? "s" : ""}`;

  const handleToggle = useCallback((tagId: string) => {
    setDraftTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }, []);

  const handleApply = useCallback(() => {
    if (hasRemoteConflict) return;
    const currentIds = new Set(task.tags?.map((t) => t.id) ?? []);
    const draftIds = Array.from(draftTagIds);

    if (
      draftIds.length === currentIds.size &&
      draftIds.every((id) => currentIds.has(id))
    ) {
      setOpen(false);
      return;
    }

    replaceTags(
      { taskId: task.id, tagIds: draftIds },
      {
        onSuccess: (response) => {
          onTaskUpdated(response.data);
          setOpen(false);
        },
        onError: () => {
          // Error toast is handled by hook
        },
      },
    );
  }, [hasRemoteConflict, task, draftTagIds, replaceTags, onTaskUpdated]);

  const handleClearAll = useCallback(() => {
    setDraftTagIds(new Set());
  }, []);

  const handleCancel = useCallback(() => {
    setDraftTagIds(new Set(task.tags?.map((t) => t.id) ?? []));
    baselineTagIdsRef.current = task.tags?.map((tag) => tag.id) ?? [];
    setHasRemoteConflict(false);
    setSearchQuery("");
    setOpen(false);
  }, [task.tags]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setDraftTagIds(new Set(task.tags?.map((t) => t.id) ?? []));
        baselineTagIdsRef.current = task.tags?.map((tag) => tag.id) ?? [];
        setHasRemoteConflict(false);
        setSearchQuery("");
        setDialogMode("picker");
      }
      setOpen(nextOpen);
    },
    [task.tags],
  );

  const openCreateDialog = useCallback(() => {
    setDialogMode("create");
  }, []);

  const closeCreateDialog = useCallback(() => {
    setDialogMode("picker");
  }, []);

  const isBusy = isReplacing || isUpdating;
  const hasChanges = useMemo(() => {
    const currentIds = new Set(task.tags?.map((t) => t.id) ?? []);
    if (draftTagIds.size !== currentIds.size) return true;
    return Array.from(draftTagIds).some((id) => !currentIds.has(id));
  }, [task.tags, draftTagIds]);

  const isTaskLocked = task.lockStatus === "OVERDUE_LOCKED";

  const handleReloadSelection = useCallback(() => {
    const canonicalIds = task.tags?.map((tag) => tag.id) ?? [];
    baselineTagIdsRef.current = canonicalIds;
    setDraftTagIds(new Set(canonicalIds));
    setHasRemoteConflict(false);
  }, [task.tags]);

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="group flex h-15.5 min-w-0 items-center gap-2.5 rounded-lg bg-background/80 px-3 text-left outline-none ring-1 ring-foreground/7 transition-[background-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-background hover:ring-foreground/12 focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.985] data-[state=open]:bg-background data-[state=open]:ring-foreground/15"
            aria-label={`Edit labels. ${committedTagCountLabel}`}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary/70 text-muted-foreground transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:bg-secondary">
              <Tag className="size-4" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10.5px] leading-4 text-muted-foreground">
                Labels
              </span>
              <span
                className={`block truncate text-[12.5px] font-medium leading-5 ${
                  committedCount > 0
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {committedTagCountLabel}
              </span>
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          collisionPadding={12}
          className="w-[min(360px,calc(100vw-2rem))] overflow-hidden p-1.5"
        >
          <div className="overflow-hidden rounded-lg bg-background ring-1 ring-foreground/7">
            <div className="flex items-center justify-between gap-3 px-3 pb-2.5 pt-3">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-medium text-foreground">
                  Labels
                </h3>
                <span className="rounded-lg bg-muted/70 px-2 py-1 text-[11px] font-semibold text-foreground tabular-nums">
                  {draftCount}/{activeTags.length}
                </span>
              </div>
              {draftCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={isBusy}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium text-muted-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/70 hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-wait disabled:opacity-60"
                >
                  <X className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  Clear all
                </button>
              )}
            </div>

            <div className="px-3 pb-3">
              <div className="group relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-focus-within:text-foreground"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search labels"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 rounded-full border border-foreground/8 bg-card/70 pl-10 pr-4 text-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground/65 hover:bg-card focus-visible:border-accent/40 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-accent/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border-t border-foreground/7 p-1.5 [scrollbar-gutter:stable]">
              {isLoading ? (
                <div className="space-y-1.5 p-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2">
                      <Skeleton className="size-6 rounded-xl" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="size-5 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : activeTags.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 px-4 py-8 text-center">
                  <Tag className="size-5 text-muted-foreground/55" strokeWidth={1.75} aria-hidden="true" />
                  <p className="mt-3 text-[12.5px] font-medium text-foreground">
                    {deferredSearch ? "No labels match your search" : "No labels yet"}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground/75">
                    {deferredSearch
                      ? "Try a different keyword."
                      : "Create one from the board menu."}
                  </p>
                </div>
              ) : (
                <>
                  {selectedTags.length > 0 && (
                    <div className="mb-2 border-b border-foreground/7 pb-2">
                      <ul className="space-y-0.5">
                        {selectedTags.map((tag) => (
                          <TagListItem
                            key={tag.id}
                            tag={tag}
                            selected
                            pending={false}
                            onToggle={handleToggle}
                            disabled={isBusy || isTaskLocked}
                          />
                        ))}
                      </ul>
                    </div>
                  )}

                  {unselectedTags.length > 0 && (
                    <div>
                      <ul className="space-y-0.5">
                        {unselectedTags.map((tag) => (
                          <TagListItem
                            key={tag.id}
                            tag={tag}
                            selected={false}
                            pending={false}
                            onToggle={handleToggle}
                            disabled={isBusy || isTaskLocked}
                          />
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            {isTaskLocked && (
              <div className="border-t border-destructive/20 bg-destructive/5 px-3 py-2.5">
                <p className="text-[11.5px] text-destructive">
                  This task is overdue. Reschedule it before changing labels.
                </p>
              </div>
            )}

            {hasRemoteConflict && (
              <div className="flex items-center justify-between gap-3 border-t border-amber-500/25 bg-amber-500/8 px-3 py-2.5">
                <p className="text-[11.5px] text-amber-800 dark:text-amber-200">
                  Labels changed elsewhere.
                </p>
                <button
                  type="button"
                  onClick={handleReloadSelection}
                  className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-amber-900 underline decoration-amber-500/60 underline-offset-2 hover:bg-amber-500/10 dark:text-amber-100"
                >
                  Reload selection
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-foreground/7 p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={openCreateDialog}
                disabled={isBusy}
                className="h-9 rounded-full px-3 text-[12.5px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15"
              >
                  <Plus className="size-3.5" strokeWidth={2} aria-hidden="true" />
                Create label
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isBusy}
                  className="h-9 rounded-full px-3 text-[12.5px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApply}
                  disabled={isBusy || hasRemoteConflict || (!hasChanges && !isTaskLocked)}
                  className="h-9 rounded-full bg-primary px-4 text-[12.5px] font-medium text-primary-foreground shadow-[0_8px_22px_-14px_color-mix(in_oklab,var(--primary)_70%,transparent)] hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-primary/20"
                >
                  {isReplacing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {dialogMode === "create" && boardId && (
        <TagEditorDialog
          boardId={boardId}
          open
          onOpenChange={(open) => {
            if (!open) closeCreateDialog();
          }}
          onSuccess={(newTag) => {
            setDraftTagIds((prev) => new Set([...prev, newTag.id]));
            closeCreateDialog();
          }}
        />
      )}
    </>
  );
}

type TagListItemProps = {
  tag: TagResponse;
  selected: boolean;
  pending: boolean;
  onToggle: (tagId: string) => void;
  disabled: boolean;
};

function TagListItem({
  tag,
  selected,
  pending,
  onToggle,
  disabled,
}: TagListItemProps) {
  const color = normalizeColor(tag.color);
  const textColor = getContrastColor(color);

  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        onClick={() => onToggle(tag.id)}
        disabled={disabled}
        className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left outline-none transition-[background-color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/60 focus-visible:ring-4 focus-visible:ring-accent/15 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 ${
          selected ? "shadow-[inset_3px_0_0_var(--primary)]" : "border-transparent"
        }`}
        style={
          selected
            ? {
                backgroundColor: `${color}14`,
                borderColor: `${color}55`,
                boxShadow: `inset 3px 0 0 ${color}`,
              }
            : undefined
        }
      >
        <span
          className={`grid size-6 shrink-0 place-items-center rounded-xl ring-1 ring-inset ring-offset-1 ring-offset-background ${
            selected ? "ring-current" : "ring-transparent"
          }`}
          style={{ backgroundColor: color, color: textColor }}
        >
          {pending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : selected ? (
            <Check className="size-3"  />
          ) : null}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground/85">
          {tag.name}
        </span>
      </button>
    </li>
  );
}
