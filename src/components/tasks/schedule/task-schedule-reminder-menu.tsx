import { Check, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { REMINDER_PRESETS } from "@/features/tasks/utils/task-schedule";
import type { ReminderPresetId } from "@/features/tasks/types";

type TaskScheduleReminderMenuProps = {
  preset: ReminderPresetId;
  enabled: boolean;
  disabled?: boolean;
  onPresetChange: (preset: ReminderPresetId) => void;
  onEnabledChange: (enabled: boolean) => void;
};

export function TaskScheduleReminderMenu({
  preset,
  enabled,
  disabled,
  onPresetChange,
  onEnabledChange,
}: TaskScheduleReminderMenuProps) {
  const activePreset = REMINDER_PRESETS.find((entry) => entry.id === preset);
  const triggerLabel = enabled
    ? activePreset?.label ?? "Pick a reminder"
    : "No reminder";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 justify-between gap-2 rounded-lg px-2.5 text-[12px] font-medium"
        >
          <span className="flex items-center gap-1.5">
            <BellRing className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            {triggerLabel}
          </span>
          <span className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
            {enabled ? "On" : "Off"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="px-2 py-1.5">
          Reminder
        </DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onEnabledChange(!enabled);
          }}
          className="gap-2"
        >
          <span
            aria-hidden="true"
            className={`grid size-5 place-items-center rounded-md ring-1 transition-colors ${
              enabled
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-background text-transparent ring-foreground/15"
            }`}
          >
            <Check className="size-3" strokeWidth={2} />
          </span>
          <span className="text-[12.5px]">{enabled ? "Disable reminder" : "Enable reminder"}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={preset}
          onValueChange={(value) => {
            onPresetChange(value as ReminderPresetId);
            onEnabledChange(true);
          }}
        >
          {REMINDER_PRESETS.map((option) => (
            <DropdownMenuRadioItem
              key={option.id}
              value={option.id}
              disabled={!enabled && option.id !== "AT_TIME"}
              className="flex-col items-start gap-0 py-1.5"
            >
              <span className="text-[12.5px] font-medium">{option.label}</span>
              <span className="text-[11px] text-muted-foreground">
                {option.description}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}