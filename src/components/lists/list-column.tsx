import {
  Clipboard,
  DotsThree,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import type { ListResponse } from "@/features/lists/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UpdateListDialog } from "./update-list-dialog";
import { DeleteListDialog } from "./delete-list-dialog";
import { useState } from "react";

interface ListColumnProps {
  list: ListResponse;
  boardId: string;
  dragHandleListeners?: Record<string, unknown>;
  isDragging?: boolean;
  disabled?: boolean;
}

export function ListColumn({
  list,
  boardId,
  dragHandleListeners,
  isDragging,
  disabled,
}: ListColumnProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div
        className="group/list relative flex w-72 min-w-72 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200 will-change-transform dark:border-border/50"
        style={{
          borderColor: isDragging ? "var(--ring)" : undefined,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-3 px-4 pt-4"
          {...dragHandleListeners}
        >
          <div className="flex min-w-0 flex-1 cursor-grab items-center gap-2.5 active:cursor-grabbing">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground transition-colors group-hover/list:bg-accent">
              <Clipboard className="h-3.5 w-3.5" weight="duotone" />
            </div>
            <h3 className="truncate text-sm font-semibold leading-tight text-foreground">
              {list.name}
            </h3>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 opacity-0 transition-opacity duration-150 group-hover/list:opacity-100 focus:opacity-100"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <DotsThree
                  className="h-4 w-4 text-muted-foreground"
                  weight="bold"
                />
                <span className="sr-only">List actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => setEditOpen(true)}
                disabled={disabled}
                className="gap-2"
              >
                <PencilSimple className="h-4 w-4 text-muted-foreground" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={disabled}
                className="gap-2"
              >
                <Trash className="h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {list.description && (
          <div className="px-4 pb-3 pt-1">
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {list.description}
            </p>
          </div>
        )}

        {/* Card drop zone */}
        <div className="mt-auto flex min-h-[140px] flex-1 items-center justify-center border-t border-border bg-secondary/30 px-4 py-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground/50">
              <Clipboard className="h-5 w-5" weight="thin" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              No cards yet
            </span>
          </div>
        </div>
      </div>

      <UpdateListDialog
        list={list}
        boardId={boardId}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteListDialog
        list={list}
        boardId={boardId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
