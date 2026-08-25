import { TaskCommentsSection } from "../comments";

export function TaskDetailSidePanel({
  taskId,
}: {
  taskId: string;
}) {
  return (
    <section
      aria-label="Task comments and activity"
      className="flex min-h-105 w-full min-w-0 flex-col bg-card/35 md:flex-1 md:overflow-hidden md:border-l md:border-foreground/8"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 md:px-7 md:py-6">
        <TaskCommentsSection taskId={taskId} />
      </div>
    </section>
  );
}
