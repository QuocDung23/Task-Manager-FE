import type { MouseEvent, PointerEvent, KeyboardEvent } from "react";


type TriggerHandlers = {
  onClick: (e: MouseEvent) => void;
  onPointerDown: (e: PointerEvent) => void;
  onKeyDown: (e: KeyboardEvent) => void;
};

export const stopDropdownTriggerPropagation: TriggerHandlers = {
  onClick: (e) => {
    e.stopPropagation();
  },
  onPointerDown: (e) => {
    e.stopPropagation();
  },
  onKeyDown: (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
    }
  },
};
