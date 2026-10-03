"use client";
import { useMemo } from "react";
import type { TaskTagSummary } from "@/features/tasks/types";
import { normalizeColor, formatTagDisplay } from "./tag-utils";

type TaskTagBadgeProps = {
  tags: TaskTagSummary[];
  maxVisible?: number;
};

export function TaskTagBadge({
  tags,
  maxVisible = 2,
}: TaskTagBadgeProps) {
  const { visible, overflowCount } = useMemo(
    () => formatTagDisplay(tags, maxVisible),
    [tags, maxVisible],
  );

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      {visible.map((tag) => (
        <span
          key={tag.id}
          title={tag.name}
          className="inline-flex min-w-0 max-w-28 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium text-foreground ring-1 ring-inset ring-foreground/6"
          style={{
            backgroundColor: normalizeColor(tag.color) + "25",
          }}
        >
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: normalizeColor(tag.color) }}
          />
          <span className="max-w-24 truncate">{tag.name}</span>
        </span>
      ))}
      {overflowCount > 0 && (
        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          +{overflowCount}
        </span>
      )}
    </div>
  );
}
