import { useEffect, useRef, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/users/user-avatar";
import type { TaskCommentUser } from "@/features/tasks/types";

const MAX_COMMENT_LENGTH = 2000;

type TaskCommentComposerProps = {
  currentUser?: TaskCommentUser | null;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
  autoFocus?: boolean;
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  variant?: "root" | "reply";
};

export function TaskCommentComposer({
  currentUser,
  placeholder = "Add a comment…",
  initialValue = "",
  submitLabel = "Comment",
  isSubmitting = false,
  autoFocus = false,
  onSubmit,
  onCancel,
  variant = "root",
}: TaskCommentComposerProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) {
      const id = window.setTimeout(() => {
        textareaRef.current?.focus();
      }, 60);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [autoFocus]);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const trimmed = value.trim();
  const length = value.length;
  const counterVisible = length > MAX_COMMENT_LENGTH * 0.75;
  const canSubmit = trimmed.length > 0 && length <= MAX_COMMENT_LENGTH;

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    onSubmit(trimmed);
    setValue("");
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    setValue(initialValue);
    onCancel?.();
  };

  const showAvatar = variant === "reply" && currentUser;

  return (
    <div className="flex items-start gap-2.5">
      {showAvatar ? (
        <div className="pt-1">
          <UserAvatar
            name={currentUser?.name}
            avatar={currentUser?.avatar}
            size="sm"
          />
        </div>
      ) : null}

      <div className="min-w-0 flex-1 space-y-1.5">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              handleCancel();
            }
          }}
          placeholder={placeholder}
          rows={variant === "reply" ? 2 : 3}
          disabled={isSubmitting}
          maxLength={MAX_COMMENT_LENGTH + 100}
          data-slot="comment-composer"
          className="resize-none text-[13.5px] leading-relaxed"
        />

        <div className="flex items-center justify-between">
          <span
            className={`text-[11px] tabular-nums ${
              length > MAX_COMMENT_LENGTH
                ? "text-destructive"
                : counterVisible
                  ? "text-muted-foreground"
                  : "text-transparent"
            }`}
          >
            {counterVisible ? `${length}/${MAX_COMMENT_LENGTH}` : "0"}
            {length > MAX_COMMENT_LENGTH ? " over limit" : ""}
          </span>

          <div className="flex items-center gap-1.5">
            {onCancel ? (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleCancel}
                disabled={isSubmitting}
                aria-label="Cancel"
              >
                <X />
              </Button>
            ) : null}

            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              aria-label={submitLabel}
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
              ) : (
                <Send className="size-3.5" />
              )}
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
