import { DetailBoard } from "@/components/boards/detail-board";
import { useParams } from "react-router-dom";

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();

  if (!boardId) {
    return <div className="p-8 text-red-500">Board ID is missing.</div>;
  }

  return <DetailBoard boardId={boardId} />;
}
