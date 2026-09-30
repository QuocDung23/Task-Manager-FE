import { useT, type TranslationKey } from "@/services/i18n";
import { useState } from "react";
import { Check, BellOff, BellRing } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REMINDER_PRESETS } from "@/features/tasks/utils/task-schedule";
import type { ReminderPresetId } from "@/features/tasks/types";

type TaskScheduleReminderMenuProps = {
  preset: ReminderPresetId;
  enabled: boolean;
  disabled?: boolean;
  onPresetChange: (preset: ReminderPresetId) => void;
  onEnabledChange: (enabled: boolean) => void;
};

const NONE_PRESET_ID = "NONE" as const;
type DisplayPreset = typeof NONE_PRESET_ID | ReminderPresetId;

const NONE_PRESET = {
  id: NONE_PRESET_ID,
} as const;

const DISPLAY_PRESETS = [NONE_PRESET, ...REMINDER_PRESETS];

const PRESET_COPY: Record<DisplayPreset, { label: TranslationKey; description: TranslationKey }> = {
  NONE: { label: "schedule.noReminder", description: "schedule.noReminderHelp" },
  AT_TIME: { label: "schedule.atTime", description: "schedule.atTimeHelp" },
  BEFORE_15: { label: "schedule.before15", description: "schedule.before15Help" },
  BEFORE_30: { label: "schedule.before30", description: "schedule.before30Help" },
  BEFORE_60: { label: "schedule.before60", description: "schedule.before60Help" },
  BEFORE_DAY: { label: "schedule.beforeDay", description: "schedule.beforeDayHelp" },
  CUSTOM: { label: "schedule.custom", description: "schedule.customHelp" },
};

export function TaskScheduleReminderMenu({
  preset,
  enabled,
  disabled,
  onPresetChange,
  onEnabledChange,
}: TaskScheduleReminderMenuProps) {
  const t = useT();
  const [open, setOpen] = useState(false);

  const activeId: DisplayPreset = enabled ? preset : NONE_PRESET_ID;
  const activeLabel = t(PRESET_COPY[activeId].label);
  const TriggerIcon = enabled ? BellRing : BellOff;

  const handlePick = (value: DisplayPreset) => {
    if (value === NONE_PRESET_ID) {
      onEnabledChange(false);
    } else {
      onPresetChange(value);
      onEnabledChange(true);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "h-9 w-full justify-between gap-2 rounded-md border-input px-2.5 text-[12.5px] font-normal tabular-nums shadow-xs",
            "hover:bg-background",
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <TriggerIcon
              className={cn(
                "size-3.5 shrink-0",
                enabled ? "text-primary" : "opacity-60",
              )}
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="truncate text-left">{activeLabel}</span>
          </span>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tabular-nums",
              enabled
                ? "bg-primary/12 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {enabled ? t("schedule.on") : t("schedule.off")}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="w-[min(280px,calc(100vw-2rem))] p-1"
      >
        <div
          role="radiogroup"
          aria-label={t("task.reminder")}
          className="flex flex-col gap-0.5"
        >
          {DISPLAY_PRESETS.map((option) => {
            const isActive = activeId === option.id;
            const isNone = option.id === NONE_PRESET_ID;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handlePick(option.id)}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors outline-none",
                  "hover:bg-accent focus-visible:bg-accent",
                  isActive && "bg-accent/60",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full ring-1 transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-background text-transparent ring-foreground/20",
                  )}
                >
                  {isActive ? (
                    <Check className="size-2.5" strokeWidth={3} />
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0">
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-[12.5px] font-medium",
                      isNone && "text-muted-foreground",
                    )}
                  >
                    {t(PRESET_COPY[option.id].label)}
                  </span>
                  <span className="text-[11px] leading-4 text-muted-foreground">
                    {t(PRESET_COPY[option.id].description)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
