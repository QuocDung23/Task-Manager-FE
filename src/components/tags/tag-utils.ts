import type { TaskTagSummary } from "@/features/tasks/types";

export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

export function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export function normalizeColor(color: string | undefined): string {
  if (!color || !isValidHexColor(color)) {
    return "#64748b";
  }
  return color;
}

export function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export const TAG_COLOR_PRESETS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#64748b",
] as const;

export function formatTagDisplay(tags: TaskTagSummary[], maxVisible = 2): {
  visible: TaskTagSummary[];
  overflowCount: number;
} {
  const visible = tags.slice(0, maxVisible);
  const overflowCount = Math.max(0, tags.length - maxVisible);
  return { visible, overflowCount };
}
