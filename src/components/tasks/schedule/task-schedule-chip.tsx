import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Lock,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getTaskSchedulePresentation,
} from "@/features/tasks/utils/task-schedule";
import type { TaskResponse } from "@/features/tasks/types";
import { TaskScheduleForm } from "./task-schedule-form";

type TaskScheduleChipProps = {
  task: TaskResponse;
  isUpdating: boolean;
  onTaskUpdated: (task: TaskResponse) => void;
};

const TONE_CLASSES: Record<
  "muted" | "neutral" | "warning" | "destructive" | "success",
  { triggerIcon: string; triggerText: string }
> = {
  muted: {
    triggerIcon: "bg-muted text-muted-foreground",
    triggerText: "text-muted-foreground",
  },
  neutral: {
    triggerIcon: "bg-muted text-muted-foreground",
    triggerText: "text-foreground",
  },
  warning: {
    triggerIcon: "bg-warning/15 text-warning-foreground",
    triggerText: "text-foreground",
  },
  destructive: {
    triggerIcon: "bg-destructive/10 text-destructive",
    triggerText: "text-destructive",
  },
  success: {
    triggerIcon: "bg-success/15 text-success",
    triggerText: "text-foreground",
  },
};

const ICON_BY_NAME = {
  calendar: CalendarDays,
  clock: Clock,
  lock: Lock,
  check: Check,
  none: CalendarDays,
} as const;

export function TaskScheduleChip({
  task,
  isUpdating,
  onTaskUpdated,
}: TaskScheduleChipProps) {
  const [open, setOpen] = useState(false);
  const presentation = useMemo(
    () => getTaskSchedulePresentation(task, new Date()),
    [task],
  );
  const tone = TONE_CLASSES[presentation.tone];
  const Icon = ICON_BY_NAME[presentation.icon];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Edit schedule. ${presentation.label}`}
          aria-busy={isUpdating}
          className="group flex h-15.5 min-w-0 items-center gap-2.5 rounded-lg bg-background/80 px-3 text-left outline-none ring-1 ring-foreground/7 transition-[background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-background hover:ring-foreground/12 focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.985] data-[state=open]:bg-background data-[state=open]:ring-foreground/15"
        >
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-md ${tone.triggerIcon}`}
          >
            <Icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10.5px] leading-4 text-muted-foreground">
              Schedule
            </span>
            <span
              className={`block truncate text-[12.5px] font-medium leading-5 ${tone.triggerText}`}
            >
              {presentation.label}
            </span>
            {presentation.helper ? (
              <span className="block truncate text-[11px] leading-4 text-muted-foreground">
                {presentation.helper}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[state=open]:rotate-180"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        collisionPadding={12}
        className="w-[min(320px,calc(100vw-2rem))] overflow-hidden p-1.5"
      >
        <TaskScheduleForm
          task={task}
          onTaskUpdated={onTaskUpdated}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}