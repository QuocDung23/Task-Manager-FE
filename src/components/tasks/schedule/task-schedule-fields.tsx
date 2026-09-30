import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { format } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { useLocale, useT } from "@/services/i18n";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  parseLocalDateValue,
  toLocalDateValue,
} from "@/features/tasks/utils/task-schedule";

type TaskScheduleDateFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  disabled?: boolean;
};

export const TaskScheduleDateField = forwardRef<
  HTMLButtonElement,
  TaskScheduleDateFieldProps
>(function TaskScheduleDateField({ id, value, onChange, min, disabled }, ref) {
  const t = useT();
  const { locale } = useLocale();
  const triggerRef = useRef<HTMLButtonElement>(null);
  useImperativeHandle(ref, () => triggerRef.current as HTMLButtonElement);

  const selectedDate = value ? parseLocalDateValue(value) : undefined;
  const minDate = min ? parseLocalDateValue(min) : undefined;
  const displayLabel = selectedDate
    ? format(selectedDate, locale === "vi" ? "d MMM yyyy" : "MMM d, yyyy", { locale: locale === "vi" ? vi : enUS })
    : t("schedule.pickDate");

  const [open, setOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onChange("");
      return;
    }
    onChange(toLocalDateValue(date.toISOString()));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "h-9 w-full justify-start gap-2 rounded-md border-input bg-background px-2.5 text-left text-[12.5px] font-normal tabular-nums shadow-xs",
            "hover:bg-background",
            !selectedDate && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="size-3.5 opacity-60" aria-hidden />
          <span className="truncate">{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={(day) => (minDate ? day < minDate : false)}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
});

type TaskScheduleTimeFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export const TaskScheduleTimeField = forwardRef<
  HTMLInputElement,
  TaskScheduleTimeFieldProps
>(function TaskScheduleTimeField({ id, value, onChange, disabled }, ref) {
  return (
    <input
      ref={ref}
      id={id}
      type="time"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-background px-2.5 text-[12.5px] tabular-nums shadow-xs",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    />
  );
});
