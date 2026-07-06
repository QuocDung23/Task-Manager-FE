import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  LucideEllipsisVertical,
  LucideSquarePen,
  LucideTrash2,
} from "lucide-react";
import { UpdateBoardDialog } from "./updateBoard-project";
import type { BoardResponse } from "@/features/boards/types";
import { useDeleteBoard } from "@/features/boards/hooks/useDeleteBoard";
import { useParams } from "react-router-dom";

interface MenuSettingProps {
  board: BoardResponse;
}

export function MenuSettingBoard({ board }: MenuSettingProps) {
  const {projectId} = useParams<{projectId: string}>()
  const [openEdit, setOpenEdit] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const { mutate: deleteBoard, isPending } = useDeleteBoard(projectId ?? "");

  const handleDelete = () => {
    deleteBoard(board.id);
  };

  return (
    <div>
      <DropdownMenu open={openMenu} onOpenChange={setOpenMenu}>
        <DropdownMenuTrigger asChild>
          <button type="button" className="inline-flex cursor-pointer">
            <LucideEllipsisVertical size={21} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setOpenMenu(false);
                setTimeout(() => setOpenEdit(true), 0);
              }}
            >
              <div className="flex items-center gap-2">
                <LucideSquarePen />
                <div>Edit</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isPending}
            >
              <div className="flex items-center gap-2">
                <LucideTrash2 />
                <div>Delete</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <UpdateBoardDialog
        board={board}
        open={openEdit}
        onOpenChange={setOpenEdit}
      />
    </div>
  );
}
