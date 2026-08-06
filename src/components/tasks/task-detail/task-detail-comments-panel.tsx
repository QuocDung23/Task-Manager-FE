import { TaskCommentsSection } from "../comments";

type TaskDetailCommentsPanelProps = {
  taskId: string;
};

export function TaskDetailCommentsPanel({ taskId }: TaskDetailCommentsPanelProps) {
  return (
    <section
      aria-label="Comments"
      className="flex min-h-105 w-full min-w-0 flex-col bg-card/35 px-5 py-5 sm:px-6 md:flex-1 md:overflow-y-auto md:border-l md:border-foreground/8 md:px-7 md:py-6"
    >
      <TaskCommentsSection taskId={taskId} />
    </section>
  );
}
