import { useMemo } from "react";
import { Loader2, MessageSquare, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaskComments } from "@/features/tasks/hooks/useTaskComments";
import { useCreateTaskComment } from "@/features/tasks/hooks/useCreateTaskComment";
import { useCurrentUser } from "@/features/users/hooks/useCurrentUser";
import { TaskCommentComposer } from "./task-comment-composer";
import { TaskCommentItem } from "./task-comment-item";

type TaskCommentsSectionProps = {
  taskId: string;
};

function CommentListSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-2.5">
          <Skeleton className="size-7 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TaskCommentsSection({ taskId }: TaskCommentsSectionProps) {
  const { data: currentUserRes } = useCurrentUser();
  const currentUser = currentUserRes?.data ?? null;

  const { mutate: createComment, isPending: isCreating } =
    useCreateTaskComment();
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTaskComments(taskId);

  const rootComments = useMemo(() => {
    if (!data?.pages?.length) return [];
    return data.pages
      .flatMap((page) => page.data.items)
      .filter((item) => item.parentCommentId === null);
  }, [data]);

  const totalCount = rootComments.length;

  return (
    <section aria-label="Comments" className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare
            className="size-3.5 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <p className="text-[13px] font-medium text-foreground">Comments</p>
          <span className="text-[11.5px] text-muted-foreground tabular-nums">
            {isLoading ? "Loading…" : `${totalCount} total`}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => refetch()}
          disabled={isRefetching}
          aria-label="Refresh comments"
          className="text-muted-foreground"
        >
          <RotateCw
            className={`size-3.5 ${
              isRefetching ? "animate-spin motion-reduce:animate-none" : ""
            }`}
          />
        </Button>
      </header>

      <TaskCommentComposer
        currentUser={currentUser}
        placeholder="Write a comment…"
        submitLabel="Comment"
        isSubmitting={isCreating}
        variant="root"
        onSubmit={(content) => createComment({ taskId, content })}
      />

      {isLoading ? (
        <CommentListSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-2 border border-destructive/20 bg-destructive/5 px-3 py-6 text-center">
          <p className="text-[13px] text-destructive">
            Could not load comments.
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RotateCw className="size-3" />
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {hasNextPage ? (
            <div className="flex justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                ) : null}
                Load older comments
              </Button>
            </div>
          ) : null}

          <ul className="space-y-5">
            {rootComments.map((comment) => (
              <li key={comment.id}>
                <TaskCommentItem taskId={taskId} comment={comment} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
