import { en } from "./dictionaries/en";
import { vi } from "./dictionaries/vi";
import { getSnapshot } from "./locale-store";

type Dictionary = typeof en;
export type TranslationKey = {
  [Group in keyof Dictionary]: `${Group & string}.${keyof Dictionary[Group] & string}`
}[keyof Dictionary];

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const [group, item] = key.split(".") as [keyof Dictionary, string];
  const dictionary: Record<string, Record<string, string>> = getSnapshot() === "vi" ? vi : en;
  const value = dictionary[group]?.[item] ?? key;
  return value.replace(/\{(\w+)\}/g, (match, token: string) => String(params?.[token] ?? match));
}
