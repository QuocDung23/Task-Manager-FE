import { useEffect, useRef, useState } from "react";
import { AlignLeft, Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TaskResponse } from "@/features/tasks/types";
import { isTaskLocked } from "@/features/tasks/utils/task-schedule";

type TaskDetailDescriptionProps = {
  task: TaskResponse;
  isUpdating: boolean;
  onSaveDescription: (description: string | undefined) => void;
};

export function TaskDetailDescription({
  task,
  isUpdating,
  onSaveDescription,
}: TaskDetailDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(task.description ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isTaskLockedState = isTaskLocked(task);

  useEffect(() => {
    setValue(task.description ?? "");
  }, [task.description]);

  useEffect(() => {
    if (isEditing) textareaRef.current?.focus();
  }, [isEditing]);

  const cancel = () => {
    setValue(task.description ?? "");
    setIsEditing(false);
  };

  const save = () => {
    const trimmed = value.trim();
    if (trimmed !== (task.description ?? "")) {
      onSaveDescription(trimmed || undefined);
    }
    setIsEditing(false);
  };

  return (
    <section
      aria-labelledby="task-description-heading"
      className="flex min-h-0 flex-col px-5 pb-5 pt-5 sm:px-6 md:overflow-y-auto md:pb-6 md:pt-5"
    >
      <div className="mb-4 flex h-7 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlignLeft
            className="size-4 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h2
            id="task-description-heading"
            className="text-[13px] font-medium text-foreground"
          >
            Description
          </h2>
        </div>

        {!isEditing && !isTaskLockedState ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsEditing(true)}
            aria-label="Edit description"
            className="text-muted-foreground"
          >
            <Pencil className="size-3.5" strokeWidth={1.5} />
          </Button>
        ) : null}
      </div>

      {isEditing ? (
        <div className="flex min-h-64 flex-1 flex-col gap-3">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                save();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancel();
              }
            }}
            placeholder="Add context, requirements, or acceptance criteria..."
            disabled={isUpdating}
            className="min-h-64 flex-1 resize-none bg-card/60 px-4 py-3 text-[13.5px] leading-6 shadow-none focus-visible:ring-ring/30"
          />

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} disabled={isUpdating}>
              <Check className="size-3.5" strokeWidth={1.75} />
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={cancel}
              disabled={isUpdating}
            >
              <X className="size-3.5" strokeWidth={1.5} />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          disabled={isTaskLockedState}
          className="group min-h-64 flex-1 rounded-lg bg-muted/35 px-4 py-3 text-left outline-none ring-1 ring-foreground/6 transition-[background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted/55 hover:ring-foreground/10 focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.995] disabled:cursor-default disabled:hover:bg-muted/35 disabled:hover:ring-foreground/6 disabled:active:scale-100"
        >
          {task.description ? (
            <p className="whitespace-pre-wrap wrap-break-word text-[13.5px] leading-6 text-foreground/85">
              {task.description}
            </p>
          ) : (
            <div className="flex min-h-56 items-center justify-center text-center">
              <p className="max-w-[28ch] text-[13px] leading-5 text-muted-foreground">
                {isTaskLockedState
                  ? "Reschedule this task to unlock description editing."
                  : "Add a description to keep scope and decisions in one place."}
              </p>
            </div>
          )}
        </button>
      )}
    </section>
  );
}
