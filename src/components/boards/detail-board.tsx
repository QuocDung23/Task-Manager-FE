import { Loader2, LucideArrowRight, LucideSearch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { useBoard } from "@/features/boards/hooks/useBoard";
import { useLists } from "@/features/lists/hooks/useLists";
import type { ListResponse } from "@/features/lists/types";
import { CreateListDialog } from "../lists/create-list-dialog";
import { TaskDetail } from "../tasks/task-detail";
import { TaskDetailProvider } from "../tasks/task-detail-context";
import { BoardDndProvider } from "./board-dnd-provider";

interface DetailBoardProps {
  boardId: string;
}

export function DetailBoard({ boardId }: DetailBoardProps) {
  const { data: boardData, isLoading: isLoadingBoard } = useBoard(boardId);
  const [page] = useState(1);
  const limit = 200;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [orderedLists, setOrderedLists] = useState<ListResponse[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: listsData,
    isLoading: isLoadingLists,
    isError: isErrorLists,
  } = useLists(boardId, page, limit, debouncedSearch);

  const board = boardData?.data;
  const pagination = listsData?.pagination;

  const isReorderDisabled = useMemo(() => {
    if (debouncedSearch) return true;
    if (pagination && pagination.totalItems > orderedLists.length) return true;
    return false;
  }, [debouncedSearch, pagination, orderedLists.length]);

  useEffect(() => {
    if (listsData?.data) {
      const sorted = [...listsData.data].sort((a, b) => a.order - b.order);
      setOrderedLists(sorted);
    }
  }, [listsData]);

  if (isLoadingBoard) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!board) {
    return <div className="p-8 text-red-500">Board not found.</div>;
  }

  if (isLoadingLists) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (isErrorLists) {
    return <div className="p-8 text-red-500">Error loading lists!</div>;
  }

  return (
    <TaskDetailProvider boardId={boardId}>
      <div className="flex flex-col flex-1 w-full">
        <div className="flex items-center justify-between w-full mt-5">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-4xl font-semibold text-zinc-900 dark:text-zinc-50">
              {board.name}
            </h2>
            <LucideArrowRight className="h-5 w-5 text-zinc-400" />
            <h2 className="font-heading text-4xl font-semibold text-zinc-900 dark:text-zinc-50">
              Lists
            </h2>
          </div>
        </div>

        <div className="w-full flex flex-col gap-4">
          <div className="relative w-full max-w-xs mt-4">
            <Input
              className="py-3 pl-10 pr-4 border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Search lists..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <LucideSearch />
            </span>
          </div>

          {orderedLists.length === 0 && !isLoadingLists ? (
            <div className="flex items-center justify-center min-h-[200px] border-2 border-dashed rounded-2xl border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-zinc-500 font-medium text-base dark:text-zinc-400">
                No lists found. Click the button to add a new list.
              </p>
            </div>
          ) : (
            <BoardDndProvider
              lists={orderedLists}
              boardId={boardId}
              isReorderDisabled={isReorderDisabled}
            />
          )}

          <CreateListDialog boardId={boardId} />
        </div>
      </div>

      <TaskDetail />
    </TaskDetailProvider>
  );
}
