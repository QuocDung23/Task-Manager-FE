import { useMemo, useState } from "react";
import {
  Check,
  CornerDownRight,
  Loader2,
  MessageCircle,
  Trash2,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getInitials } from "@/utils/getInitials";
import { getAvatarUrl } from "@/utils/getAvatarUrl";
import { formatDateTime } from "@/utils/formatDateTime";
import { TaskCommentActions } from "./task-comment-actions";
import { TaskCommentComposer } from "./task-comment-composer";
import { useCurrentUser } from "@/features/users/hooks/useCurrentUser";
import { useCreateTaskCommentReply } from "@/features/tasks/hooks/useCreateTaskCommentReply";
import { useDeleteTaskComment } from "@/features/tasks/hooks/useDeleteTaskComment";
import { useUpdateTaskComment } from "@/features/tasks/hooks/useUpdateTaskComment";
import { useTaskCommentReplies } from "@/features/tasks/hooks/useTaskCommentReplies";
import type { TaskComment, TaskCommentUser } from "@/features/tasks/types";

type TaskCommentItemProps = {
  taskId: string;
  comment: TaskComment;
};

function isEdited(comment: TaskComment): boolean {
  if (!comment.updatedAt || !comment.createdAt) return false;
  return (
    new Date(comment.updatedAt).getTime() !==
    new Date(comment.createdAt).getTime()
  );
}

function CommentAvatar({
  user,
  size = "default",
}: {
  user?: TaskCommentUser | null;
  size?: "default" | "sm";
}) {
  const initials = user ? getInitials(user.name) : null;
  const src = user ? getAvatarUrl(user.avatar) : null;
  return (
    <Avatar size={size} className="ring-1 ring-border">
      {user?.avatar ? (
        <AvatarImage src={src ?? undefined} alt={user.name} />
      ) : null}
      <AvatarFallback className={size === "sm" ? "text-[10px]" : "text-[11px]"}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function CommentBody({
  comment,
  onSubmitEdit,
  onCancelEdit,
  isEditing,
  editingValue,
  setEditingValue,
  isUpdating,
}: {
  comment: TaskComment;
  isEditing: boolean;
  editingValue: string;
  setEditingValue: (next: string) => void;
  isUpdating: boolean;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
}) {
  if (!isEditing) {
    return (
      <p className="whitespace-pre-wrap wrap-break-words text-[13.5px] leading-relaxed text-foreground/90">
        {comment.content}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={editingValue}
        onChange={(e) => setEditingValue(e.target.value)}
        rows={3}
        disabled={isUpdating}
        maxLength={2000}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            onSubmitEdit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancelEdit();
          }
        }}
        className="resize-none text-[13.5px] leading-relaxed"
      />
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="default"
          onClick={onSubmitEdit}
          disabled={isUpdating || editingValue.trim().length === 0}
        >
          {isUpdating ? (
            <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
          ) : (
            <Check className="size-3" />
          )}
          Save
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onCancelEdit}
          disabled={isUpdating}
          aria-label="Cancel edit"
        >
          <X />
        </Button>
      </div>
    </div>
  );
}

export function TaskCommentItem({ taskId, comment }: TaskCommentItemProps) {
  const { data: currentUserRes } = useCurrentUser();
  const currentUser = currentUserRes?.data ?? null;
  const currentUserId = currentUser?.id;
  const isAuthor = currentUserId === comment.userId;
  const parentCommentId = comment.parentCommentId ?? null;
  const isReply = parentCommentId !== null;
  const isDeleted = Boolean(comment.deletedAt);

  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replyComposerOpen, setReplyComposerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState(comment.content);

  const { mutate: updateComment, isPending: isUpdating } =
    useUpdateTaskComment();
  const { mutate: deleteComment, isPending: isDeleting } =
    useDeleteTaskComment();
  const { mutate: createReply, isPending: isCreatingReply } =
    useCreateTaskCommentReply();

  const { data: repliesQuery, isFetching: isFetchingReplies } =
    useTaskCommentReplies(taskId, comment.id, { enabled: repliesOpen });

  const replies = useMemo(() => {
    if (!repliesQuery?.pages?.length) return [] as TaskComment[];
    return repliesQuery.pages
      .flatMap((page) => page.data.items)
      .filter((item) => item.id !== comment.id);
  }, [repliesQuery, comment.id]);

  const showRepliesCount = !isReply && comment.replyCount > 0;
  const hasMoreReplies =
    repliesQuery?.pages[repliesQuery.pages.length - 1]?.data.nextCursor !==
    null;

  const handleSubmitEdit = () => {
    if (!isAuthor) return;
    const trimmed = editingValue.trim();
    if (!trimmed || trimmed === comment.content) {
      setEditingValue(comment.content);
      setIsEditing(false);
      return;
    }
    updateComment(
      {
        taskId,
        commentId: comment.id,
        parentCommentId,
        content: trimmed,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      },
    );
  };

  const handleCancelEdit = () => {
    setEditingValue(comment.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!isAuthor) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete this comment? Replies will also be removed.")
    ) {
      return;
    }
    deleteComment({ taskId, commentId: comment.id });
  };

  const handleSubmitReply = (content: string) => {
    if (!parentCommentId) return;
    createReply(
      {
        taskId,
        parentCommentId: parentCommentId,
        content,
      },
      {
        onSuccess: () => {
          setReplyComposerOpen(false);
          setRepliesOpen(true);
        },
      },
    );
  };

  return (
    <article className="space-y-2">
      <div className="flex items-start gap-2.5">
        <CommentAvatar user={comment.user} size={isReply ? "sm" : "default"} />
        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[12px] leading-tight">
            <div>
              <span className="font-medium text-foreground">
                {comment.user?.name ?? "Unknown"}
              </span>
              <span aria-hidden="true" className="text-muted-foreground/40">
                ·
              </span>
              <time
                dateTime={comment.createdAt}
                title={formatDateTime(comment.createdAt)}
                className="text-muted-foreground tabular-nums"
              >
                {formatDateTime(comment.createdAt)}
              </time>
              {isEdited(comment) ? (
                <span className="text-[10.5px] text-muted-foreground/60">
                  edited
                </span>
              ) : null}
            </div>
            <div>
              <TaskCommentActions
                canEdit={isAuthor && !isDeleted}
                canDelete={isAuthor && !isDeleted}
                onEdit={() => {
                  setEditingValue(comment.content);
                  setIsEditing(true);
                }}
                onDelete={handleDelete}
              />
            </div>
          </header>

          <div className="mt-1">
            {isDeleted ? (
              <p className="text-[13px] text-muted-foreground">
                Comment deleted
              </p>
            ) : (
              <CommentBody
                comment={comment}
                isEditing={isEditing}
                editingValue={editingValue}
                setEditingValue={setEditingValue}
                isUpdating={isUpdating}
                onSubmitEdit={handleSubmitEdit}
                onCancelEdit={handleCancelEdit}
              />
            )}
          </div>

          {!isDeleted ? (
            <div className="mt-1.5 flex items-center gap-1">
              {!isReply ? (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setRepliesOpen((prev) => !prev);
                    setReplyComposerOpen((prev) => !prev);
                  }}
                  disabled={isUpdating || isDeleting}
                  className="text-muted-foreground"
                >
                  <CornerDownRight className="size-3" />
                  Reply
                </Button>
              ) : null}

              {showRepliesCount ? (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setRepliesOpen((prev) => !prev)}
                  disabled={isUpdating}
                  className="text-muted-foreground"
                >
                  <MessageCircle className="size-3" />
                  {repliesOpen
                    ? "Hide replies"
                    : `Show ${comment.replyCount} ${
                        comment.replyCount === 1 ? "reply" : "replies"
                      }`}
                </Button>
              ) : null}

              {isDeleting ? (
                <span
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                  aria-live="polite"
                >
                  <Trash2 className="size-3" aria-hidden="true" />
                  Removing…
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {replyComposerOpen && !isDeleted ? (
        <div className="ml-9">
          <TaskCommentComposer
            currentUser={currentUser}
            placeholder="Write a reply…"
            submitLabel="Reply"
            isSubmitting={isCreatingReply}
            autoFocus
            variant="reply"
            onSubmit={handleSubmitReply}
            onCancel={() => setReplyComposerOpen(false)}
          />
        </div>
      ) : null}

      {repliesOpen && !isReply && comment.replyCount > 0 ? (
        <div className="ml-9 space-y-3 border-l border-border pl-3">
          {isFetchingReplies && replies.length === 0 ? (
            <div className="flex items-start gap-2.5">
              <Skeleton className="size-7 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ) : null}

          {replies.map((reply) => (
            <TaskCommentItem key={reply.id} taskId={taskId} comment={reply} />
          ))}

          {hasMoreReplies ? (
            <button
              type="button"
              className="text-[11.5px] text-primary hover:text-primary/80"
            >
              Load older replies
            </button>
          ) : null}

          {replies.length === 0 && !isFetchingReplies ? (
            <p className="text-[12px] text-muted-foreground">No replies yet.</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
