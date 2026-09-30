import { useT } from "@/services/i18n";
import { TranslateText } from "@/services/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { EllipsisVertical, Pencil, Trash2 } from "lucide-react";

type TaskCommentActionsProps = {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function TaskCommentActions({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: TaskCommentActionsProps) {
  const t = useT();
  if (!canEdit && !canDelete) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t("task.commentActions")}
          className="text-muted-foreground"
        >
          <EllipsisVertical className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-36">
        {canEdit ? (
          <DropdownMenuItem onSelect={onEdit} className="cursor-pointer">
            <Pencil />
            <TranslateText id="common.edit" />
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <DropdownMenuItem
            variant="destructive"
            onSelect={onDelete}
            className="cursor-pointer"
          >
            <Trash2 />
            <TranslateText id="common.delete" />
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
