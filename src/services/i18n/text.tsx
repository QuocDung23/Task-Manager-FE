import { useT } from "./use-locale";
import type { TranslationKey } from "./translate";

export function TranslateText({ id }: { id: TranslationKey }) {
  const t = useT();
  return t(id);
}
