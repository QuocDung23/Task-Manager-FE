import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { useBoard } from "@/features/boards/hooks/useBoard";
import { useLists } from "@/features/lists/hooks/useLists";
import { EASE_FLUID } from "@/lib/motion";

import { CreateListDialog } from "../lists/create-list-dialog";
import { TaskDetail } from "../tasks/task-detail";
import { TaskDetailProvider } from "../tasks/task-detail-provider";
import { TaskScheduleFilter } from "../tasks/schedule/task-schedule-filter";
import type { TaskListFilters } from "@/features/tasks/types";
import { BoardDndProvider } from "./board-dnd-provider";
import { TagFilter } from "../tags/tag-filter";
import { BoardTagsManagerDialog } from "../tags/board-tags-manager-dialog";
import { useBoardRoom } from "@/features/realtime/hooks/useBoardRoom";

interface DetailBoardProps {
  boardId: string;
}

const enterTransition = (reduceMotion: boolean | null) =>
  reduceMotion ? { duration: 0 } : { duration: 0.55, ease: EASE_FLUID };

const contentTransition = (reduceMotion: boolean | null) =>
  reduceMotion
    ? { duration: 0 }
    : { duration: 0.6, delay: 0.06, ease: EASE_FLUID };

export function DetailBoard({ boardId }: DetailBoardProps) {
  const { data: boardData, isLoading: isLoadingBoard } = useBoard(boardId);
  const [page] = useState(1);
  const limit = 200;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [taskFilters, setTaskFilters] = useState<TaskListFilters>({});
  const [tagsManagerOpen, setTagsManagerOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: listsData,
    isLoading: isLoadingLists,
    isError: isErrorLists,
  } = useLists(boardId, page, limit, debouncedSearch);

  const board = boardData?.data;
  const pagination = listsData?.pagination;
  useBoardRoom(
    boardId,
    listsData?.data.map((list) => list.id) ?? [],
  );

  // Pure derived state — sort on the fly from server payload. No effect,
  // no `setState` inside an effect; just memoize the sorted view.
  const orderedLists = useMemo(() => {
    if (!listsData?.data) return [];
    return [...listsData.data].sort((a, b) => a.order - b.order);
  }, [listsData]);

  const isReorderDisabled = useMemo(() => {
    if (debouncedSearch) return true;
    if (pagination && pagination.totalItems > orderedLists.length) return true;
    return false;
  }, [debouncedSearch, pagination, orderedLists.length]);

  const hasActiveFilters = (value: TaskListFilters) =>
    Boolean(value.scheduleState || value.lockStatus || value.dueBefore || value.dueAfter || (value.tagIds && value.tagIds.length > 0));

  if (isLoadingBoard) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border border-border/60 bg-card/60 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <Loader2
            className="size-4 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
          <span className="text-[12.5px] font-medium text-muted-foreground">
            Loading board
          </span>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center px-4">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-[13px] font-medium text-destructive">
          Board not found.
        </div>
      </div>
    );
  }

  if (isLoadingLists) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border border-border/60 bg-card/60 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <Loader2
            className="size-4 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
          <span className="text-[12.5px] font-medium text-muted-foreground">
            Loading lists
          </span>
        </div>
      </div>
    );
  }

  if (isErrorLists) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center px-4">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-[13px] font-medium text-destructive">
          Error loading lists.
        </div>
      </div>
    );
  }

  return (
    <TaskDetailProvider boardId={boardId}>
      <div className="flex w-full flex-1 flex-col">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={enterTransition(reduceMotion)}
          className="mt-2 flex flex-col gap-5"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
                Board
              </p>
              <h1 className="mt-2 truncate font-heading text-[28px] font-semibold leading-none tracking-[-0.02em] text-foreground sm:text-[32px]">
                {board.name}
              </h1>
              <div className="mt-3 flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
                <span className="tabular-nums text-foreground/80">
                  {orderedLists.length}
                </span>
                <span className="text-muted-foreground/70">
                  {orderedLists.length === 1 ? "list" : "lists"}
                </span>
                <span
                  className="size-1 rounded-full bg-muted-foreground/30"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground/80">
                  Drag to reorder lanes
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CreateListDialog boardId={boardId} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTagsManagerOpen(true)}
                aria-label="Manage labels"
                className="group h-9 gap-2 rounded-full border border-foreground/8 bg-card/70 px-3 text-[12.5px] font-medium text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,background-color,color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-primary/20 hover:bg-card hover:text-foreground focus-visible:border-accent/40 focus-visible:ring-4 focus-visible:ring-accent/15 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105">
                  <Tag
                    className="size-3.5"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </span>
                Manage labels
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="group relative w-full max-w-sm">
              <span
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-focus-within:text-foreground"
                aria-hidden="true"
              >
                <Search className="size-4" strokeWidth={1.75} />
              </span>
              <Input
                type="search"
                placeholder="Search lists"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 rounded-full border border-foreground/8 bg-card/70 pl-10 pr-4 text-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground/65 hover:bg-card focus-visible:border-accent/40 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-accent/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              />
            </div>
            <TaskScheduleFilter
              filters={taskFilters}
              onChange={setTaskFilters}
            />
            <TagFilter
              filters={taskFilters}
              onChange={setTaskFilters}
              boardId={boardId}
            />
          </div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={contentTransition(reduceMotion)}
          className="mt-6 flex flex-col gap-4"
        >
          {orderedLists.length === 0 && !isLoadingLists ? (
            <div className="flex min-h-70 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/80 bg-card/40 px-6 text-center">
              <div className="rounded-2xl bg-muted/60 p-1.5 ring-1 ring-inset ring-border/60">
                <div className="grid size-10 place-items-center rounded-[calc(1rem-0.375rem)] bg-card text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_24px_-16px_rgba(15,23,42,0.18)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <Search
                    className="size-4"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[13.5px] font-medium text-foreground">
                  No lists yet
                </p>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  Add the first lane to start grouping tasks on this board.
                </p>
              </div>
            </div>
          ) : (
            <BoardDndProvider
              lists={orderedLists}
              boardId={boardId}
              isReorderDisabled={isReorderDisabled || hasActiveFilters(taskFilters)}
              taskFilters={taskFilters}
            />
          )}
        </motion.div>
      </div>

      <TaskDetail />
      <BoardTagsManagerDialog
        boardId={boardId}
        open={tagsManagerOpen}
        onOpenChange={setTagsManagerOpen}
      />
    </TaskDetailProvider>
  );
}
