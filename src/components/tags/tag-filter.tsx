"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useTags } from "@/features/tags/hooks/useTags";
import type { TagResponse } from "@/features/tags/types";
import type { TaskListFilters, TaskTagFilterMode } from "@/features/tasks/types";
import { getContrastColor, normalizeColor } from "./tag-utils";

type TagFilterProps = {
  filters: TaskListFilters;
  onChange: (filters: TaskListFilters) => void;
  boardId: string;
};

export function TagFilter({ filters, onChange, boardId }: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(
    () => new Set(filters.tagIds ?? []),
  );
  const [tagMode, setTagMode] = useState<TaskTagFilterMode>(
    filters.tagMode ?? "ANY",
  );

  const deferredSearch = useDeferredValue(searchQuery);
  const { data: allTags = [], isLoading } = useTags(boardId);
  const activeTags = (allTags as TagResponse[]).filter(
    (tag: TagResponse) => tag.status === "ACTIVE",
  );

  const filteredTags = useMemo(() => {
    if (!deferredSearch) return activeTags;
    const query = deferredSearch.toLowerCase();
    return activeTags.filter((tag: TagResponse) =>
      tag.name.toLowerCase().includes(query),
    );
  }, [activeTags, deferredSearch]);

  const selectedCount = localSelectedIds.size;
  const hasActiveFilter = selectedCount > 0;

  const handleToggle = useCallback((tagId: string) => {
    setLocalSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }, []);

  const handleApply = useCallback(() => {
    const tagIds = Array.from(localSelectedIds);
    onChange({
      ...filters,
      tagIds: tagIds.length > 0 ? tagIds : undefined,
      tagMode: tagIds.length > 0 ? tagMode : undefined,
    });
    setOpen(false);
  }, [filters, localSelectedIds, onChange, tagMode]);

  const handleClear = useCallback(() => {
    setLocalSelectedIds(new Set());
    setTagMode("ANY");
    onChange({
      ...filters,
      tagIds: undefined,
      tagMode: undefined,
    });
    setOpen(false);
  }, [filters, onChange]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setLocalSelectedIds(new Set(filters.tagIds ?? []));
        setTagMode(filters.tagMode ?? "ANY");
        setSearchQuery("");
      }
      setOpen(nextOpen);
    },
    [filters],
  );

  return (
    <div className="inline-flex items-center gap-1">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`group flex h-10 items-center gap-2 rounded-full border px-3.5 text-[12.5px] font-medium outline-none transition-[background-color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:ring-4 focus-visible:ring-accent/15 ${
              hasActiveFilter
                ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 data-[state=open]:bg-primary/15"
                : "border-foreground/8 bg-card/70 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(15,23,42,0.03)] hover:border-foreground/12 hover:bg-card hover:text-foreground data-[state=open]:bg-card"
            }`}
            aria-label={`Filter by labels. ${selectedCount} selected.`}
          >
            <Tag className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Labels</span>
            {hasActiveFilter ? (
              <span className="grid size-5 place-items-center rounded-full bg-primary text-[10.5px] font-semibold text-primary-foreground">
                {selectedCount}
              </span>
            ) : null}
            <ChevronDown
              className="ml-0.5 size-3.5 shrink-0 text-muted-foreground/65 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[state=open]:rotate-180"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          collisionPadding={12}
          className="w-[min(400px,calc(100vw-2rem))] overflow-hidden p-1.5"
        >
          <div className="overflow-hidden rounded-lg bg-background ring-1 ring-foreground/7">
            <div className="flex items-center justify-between gap-3 px-3 pb-2.5 pt-3">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary">
                  <SlidersHorizontal className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <h3 className="text-[13px] font-medium text-foreground">
                  Filter by labels
                </h3>
              </div>
              <span className="rounded-lg bg-muted/70 px-2 py-1 tabular-nums text-[11px] font-semibold text-foreground">
                {selectedCount}/{activeTags.length}
              </span>
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
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-10 rounded-full border border-foreground/8 bg-card/70 pl-10 pr-4 text-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground/65 hover:bg-card focus-visible:border-accent/40 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-accent/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                />
              </div>
            </div>

            {selectedCount >= 2 ? (
              <div className="flex flex-wrap items-center gap-2 border-y border-foreground/7 bg-muted/20 px-3 py-2.5">
                <span className="text-[11.5px] font-medium text-muted-foreground">
                  Match
                </span>
                <div className="flex rounded-full border border-foreground/10 bg-background/65 p-1">
                  {(["ANY", "ALL"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTagMode(mode)}
                      className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-[background-color,color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15 ${
                        tagMode === mode
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      }`}
                    >
                      {mode === "ANY" ? "Any" : "All"}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground/75">
                  {tagMode === "ANY"
                    ? "at least one selected"
                    : "every selected label"}
                </span>
              </div>
            ) : null}

            <div className="max-h-56 overflow-y-auto border-t border-foreground/7 p-1.5 [scrollbar-gutter:stable]">
              {isLoading ? (
                <div className="space-y-1.5 p-1">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2">
                      <Skeleton className="size-6 rounded-xl" />
                      <Skeleton className="h-3.5 flex-1" />
                      <Skeleton className="size-5 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : filteredTags.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 px-4 py-8 text-center">
                  <Tag className="size-5 text-muted-foreground/55" strokeWidth={1.75} aria-hidden="true" />
                  <p className="mt-3 text-[12.5px] font-medium text-foreground">
                    {deferredSearch ? "No labels match your search" : "No labels available"}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                    {deferredSearch
                      ? "Try a different keyword."
                      : "Create a label from the board menu."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {filteredTags.map((tag: TagResponse) => {
                    const isSelected = localSelectedIds.has(tag.id);
                    const color = normalizeColor(tag.color);
                    return (
                      <li key={tag.id}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          onClick={() => handleToggle(tag.id)}
                          className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left outline-none transition-[background-color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/60 focus-visible:ring-4 focus-visible:ring-accent/15 active:scale-[0.99] ${
                            isSelected
                              ? "border-primary/15 bg-primary/5"
                              : "border-transparent"
                          }`}
                        >
                          <span
                            className="grid size-6 shrink-0 place-items-center rounded-xl ring-1 ring-inset ring-foreground/10"
                            style={{ backgroundColor: color }}
                            aria-hidden="true"
                          >
                            {isSelected ? (
                              <Check
                                className="size-3.5"
                                strokeWidth={2.5}
                                style={{ color: getContrastColor(color) }}
                                aria-hidden="true"
                              />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-foreground/90">
                            {tag.name}
                          </span>
                          {isSelected ? (
                            <span className="text-[10.5px] font-medium text-primary">Selected</span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-foreground/7 p-2">
              {hasActiveFilter ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium text-muted-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/70 hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15"
                >
                  <X className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  Clear
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="h-9 rounded-full px-3 text-[12px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApply}
                  className="h-9 rounded-full bg-primary px-4 text-[12px] font-medium text-primary-foreground shadow-[0_8px_22px_-14px_color-mix(in_oklab,var(--primary)_70%,transparent)] hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-primary/20"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {hasActiveFilter ? (
        <button
          type="button"
          aria-label="Clear label filter"
          onClick={handleClear}
          className="grid size-7 place-items-center rounded-full text-muted-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/70 hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15"
        >
          <X className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
