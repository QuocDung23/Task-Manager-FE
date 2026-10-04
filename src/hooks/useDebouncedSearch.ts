import { useEffect, useRef } from "react";

export function useDebouncedSearch(
  search: string,
  committedSearch: string,
  onCommit: (value: string) => void,
  delay = 500,
  scopeKey = "",
): void {
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    onCommitRef.current = onCommit;
  });

  useEffect(() => {
    const value = search.trim();
    if (value === committedSearch) return;

    const timer = setTimeout(() => {
      onCommitRef.current(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [search, committedSearch, delay, scopeKey]);
}
