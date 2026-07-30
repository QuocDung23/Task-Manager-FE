import { CreateBoardDialog } from "./createBoard-project";

interface CreateBoardButtonProps {
  projectId: string;
}

export function CreateBoardButton({ projectId }: CreateBoardButtonProps) {
  return <CreateBoardDialog projectId={projectId} />;
}
