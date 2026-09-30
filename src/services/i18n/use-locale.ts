import { useEffect, useSyncExternalStore } from "react";
import { getSnapshot, setLocale, subscribe } from "./locale-store";
import { t } from "./translate";

export function useLocale() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, () => "en" as const);
  return { locale, setLocale };
}

export function useT() {
  useLocale();
  return t;
}

export function useClearOnLocaleChange(clear: () => void): void {
  useEffect(() => subscribe(clear), [clear]);
}
