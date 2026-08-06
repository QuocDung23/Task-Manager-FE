import { CalendarClock, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TaskListFilters, TaskScheduleState } from "@/features/tasks/types";

const SCHEDULE_LABELS: Record<TaskScheduleState, string> = {
  none: "No deadline",
  scheduled: "Scheduled",
  due_soon: "Due soon",
  overdue_locked: "Overdue · Locked",
  done: "Done",
};

const ALL_STATES: TaskScheduleState[] = [
  "none",
  "scheduled",
  "due_soon",
  "overdue_locked",
  "done",
];

type TaskScheduleFilterProps = {
  filters: TaskListFilters;
  onChange: (next: TaskListFilters) => void;
};

export function TaskScheduleFilter({ filters, onChange }: TaskScheduleFilterProps) {
  const hasActiveFilters = Boolean(filters.scheduleState);

  const setState = (value: string) => {
    const next: TaskListFilters = {
      ...filters,
      scheduleState: value === "" ? undefined : (value as TaskScheduleState),
    };
    onChange(next);
  };

  const reset = () => {
    onChange({});
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-2 rounded-full border border-foreground/8 bg-card/70 px-3 text-[12.5px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(15,23,42,0.03)]"
        >
          <CalendarClock className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
          Schedule
          {hasActiveFilters ? (
            <span className="grid size-5 place-items-center rounded-full bg-primary text-[10.5px] font-semibold text-primary-foreground">
              1
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Filter by schedule</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={filters.scheduleState ?? ""}
          onValueChange={setState}
        >
          <DropdownMenuRadioItem value="">All states</DropdownMenuRadioItem>
          {ALL_STATES.map((state) => (
            <DropdownMenuRadioItem key={state} value={state}>
              {SCHEDULE_LABELS[state]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <div className="p-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center gap-1.5"
            disabled={!hasActiveFilters}
            onClick={reset}
          >
            <FilterX className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
            Reset filter
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}