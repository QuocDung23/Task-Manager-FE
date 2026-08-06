import { forwardRef } from "react";
import { Input } from "@/components/ui/input";

type TaskScheduleDateFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  disabled?: boolean;
};

export const TaskScheduleDateField = forwardRef<
  HTMLInputElement,
  TaskScheduleDateFieldProps
>(function TaskScheduleDateField(
  { id, value, onChange, min, disabled },
  ref,
) {
  return (
    <Input
      ref={ref}
      id={id}
      type="date"
      value={value}
      min={min}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 px-2.5 text-[12.5px] tabular-nums"
    />
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
    <Input
      ref={ref}
      id={id}
      type="time"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 px-2.5 text-[12.5px] tabular-nums"
    />
  );
});