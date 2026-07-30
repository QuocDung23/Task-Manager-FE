import { useAddMemberBoard } from "@/features/boards/hooks/useAddMemberBoard";
import { AddMemberDialog } from "./addMember-dialog";

interface AddMemberBoardProps {
  boardId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export function DialogAddMemberBoard({
  boardId,
  projectId,
  open,
  onOpenChange,
}: AddMemberBoardProps) {
  const { mutateAsync } = useAddMemberBoard(boardId, projectId);

  return (
    <AddMemberDialog
      scope="board"
      open={open}
      onOpenChange={onOpenChange}
      onAdd={(user) => mutateAsync(user.id)}
    />
  );
}
