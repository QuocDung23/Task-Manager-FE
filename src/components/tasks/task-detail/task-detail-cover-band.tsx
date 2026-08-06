type TaskDetailCoverBandProps = {
  accent?: string;
};

export function TaskDetailCoverBand({
  accent = "var(--border)",
}: TaskDetailCoverBandProps) {
  const safeAccent = /^[#][0-9a-fA-F]{6}$/.test(accent)
    ? accent
    : "var(--border)";

  return (
    <div
      className="h-px w-full shrink-0"
      style={{ backgroundColor: safeAccent }}
      aria-hidden="true"
    />
  );
}

type TaskDetailHeaderMetaProps = {
  caption?: string;
  savedAgo?: string;
};

export function TaskDetailHeaderMeta({
  caption = "Live preview",
  savedAgo,
}: TaskDetailHeaderMetaProps) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 text-[11px] text-muted-foreground">
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-muted-foreground/50"
      />
      <span className="truncate">{caption}</span>
      {savedAgo ? (
        <>
          <span aria-hidden="true" className="text-muted-foreground/40">
            ·
          </span>
          <span className="truncate tabular-nums">{savedAgo}</span>
        </>
      ) : null}
    </span>
  );
}
