import { useEffect, useRef, useState } from "react";
import { Check, ListChecks, Pencil, X } from "lucide-react";
import { DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TaskResponse } from "@/features/tasks/types";
import { isTaskLocked } from "@/features/tasks/utils/task-schedule";


type TaskDetailHeaderProps = {
  task: TaskResponse;
  listTitle?: string;
  boardTitle?: string;
  isUpdating: boolean;
  onSaveName: (name: string) => void;
};

export function TaskDetailHeader({
  task,
  listTitle,
  boardTitle,
  isUpdating,
  onSaveName,
}: TaskDetailHeaderProps) {
  const [nameValue, setNameValue] = useState(task.name);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isTaskLockedState = isTaskLocked(task);

  useEffect(() => {
    setNameValue(task.name);
  }, [task.name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== task.name) {
      onSaveName(trimmed);
    } else {
      setNameValue(task.name);
    }
    setIsEditing(false);
  };

  return (
    <header className="flex shrink-0 flex-col gap-3 border-b border-foreground/8 bg-card/45 px-5 pb-4 pt-4 sm:px-7">
      <div className="flex items-center justify-between gap-3">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground"
        >
          {boardTitle ? (
            <>
              <span className="truncate text-foreground/80">{boardTitle}</span>
              <span aria-hidden="true" className="text-muted-foreground/40">
                /
              </span>
            </>
          ) : null}
          {listTitle ? (
            <>
              <span className="inline-flex max-w-44 items-center gap-1 text-foreground/80">
                <ListChecks className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{listTitle}</span>
              </span>
            </>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close detail"
              className="text-muted-foreground"
            >
              <X />
            </Button>
          </DialogClose>
        </div>
      </div>

      <div className="flex items-start gap-3">
        {isEditing ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Input
              ref={inputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") {
                  setNameValue(task.name);
                  setIsEditing(false);
                }
              }}
              disabled={isUpdating}
              className="h-10 min-w-0 bg-background text-[18px] font-medium"
            />
            <Button
              size="icon-sm"
              variant="default"
              onClick={handleSubmit}
              disabled={isUpdating}
              aria-label="Save task name"
            >
              <Check />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                setNameValue(task.name);
                setIsEditing(false);
              }}
              aria-label="Cancel task name edit"
            >
              <X />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={isTaskLockedState}
            className="group flex min-w-0 flex-1 items-start gap-2 rounded-lg px-1 py-0.5 text-left outline-none transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted/45 focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.995] disabled:cursor-default disabled:hover:bg-transparent disabled:active:scale-100"
          >
            <h1 className="min-w-0 flex-1 wrap-break-words text-[18px] font-medium leading-snug text-foreground sm:text-[19px]">
              {task.name}
            </h1>
            {!isTaskLockedState ? (
              <Pencil
                className="mt-1 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            ) : null}
          </button>
        )}
      </div>
    </header>
  );
}

