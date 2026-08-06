import { AlertTriangle } from "lucide-react";
import { formatLocalDateTime } from "@/features/tasks/utils/task-schedule";

type TaskScheduleLockAlertProps = {
  lockReason?: string | null;
  lockedAt?: string | null;
};

export function TaskScheduleLockAlert({
  lockReason,
  lockedAt,
}: TaskScheduleLockAlertProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-2.5"
    >
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-destructive/10 text-destructive">
        <AlertTriangle className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 text-[12px] leading-5 text-destructive">
        <p className="font-medium">This task is overdue and locked.</p>
        <p className="mt-0.5 text-destructive/85">
          {lockReason ? `Reason: ${lockReason}` : "Pick a new deadline to resume work on this task."}
        </p>
        {lockedAt ? (
          <p className="mt-0.5 text-[11px] text-destructive/70">
            Locked at {formatLocalDateTime(lockedAt)}
          </p>
        ) : null}
      </div>
    </div>
  );
}