import { HeaderLayout } from "@/layouts/header-layout";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Input } from "../ui/input";
import { Loader2, LucideArrowRight, LucideSearch } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useBoards } from "@/features/boards/hooks/useBoards";
import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { BoardCard } from "./boardCard-project";
import { PaginationLayout } from "@/layouts/pagination-layout";
import { CreateBoardDialog } from "./createBoard-project";
import { MenuSettingBoard } from "./settingBoard-project";
import { useEditTitleProject } from "@/features/projects/hooks/useEditTitleProject";
import { DropDownSettingProject } from "./dropDown-setting-project";
import { APP_ROUTES } from "@/router/constans";

interface DetailProjectLocationState {
  projectName?: string;
}

export function DetailProject() {
  //dùng để lấy dữ liệu ở trang trước truyền vào
  const location = useLocation();
  const { projectName: initialProjectName } =
    (location.state as DetailProjectLocationState | null) ?? {};
  //lấy dữ liệu từ url
  const { projectId } = useParams<{ projectId: string }>();

  const navigate = useNavigate();
  const { editing, setEditing, title, setTitle, handleSave, handleKeyBoard } =
    useEditTitleProject(projectId ?? "", initialProjectName || "Project");

  const [page, setPage] = useState(1);
  const limit = 12;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [search]);

  const {
    data: responseData,
    isLoading,
    isError,
  } = useBoards(projectId ?? "", page, limit, debouncedSearch);
  const boards = Array.isArray(responseData?.data) ? responseData.data : [];
  const pagination = responseData?.pagination;
  const totalPage = pagination?.totalPages ?? 1;

  if (!projectId) {
    return <div className="p-8 text-red-500">Project id is missing.</div>;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }
  if (isError) {
    return <div className="p-8 text-red-500">Error loading board list!</div>;
  }

  return (
    <div className="flex flex-col flex-1 w-full gap-6">
      <div className="flex items-center justify-between w-full">
        <HeaderLayout>
          <div className="flex items-center gap-2">
            {editing ? (
              <Input
                autoFocus
                className="h-auto py-1 px-2 text-base font-semibold w-auto min-w-[150px] max-w-[300px] text-zinc-900 bg-zinc-100 border-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-md"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyBoard}
              />
            ) : (
              <span
                onClick={() => setEditing(true)}
                className="cursor-pointer font-semibold text-zinc-900 hover:bg-zinc-200/50 px-2 py-1 rounded-md transition-colors"
              >
                {title}
              </span>
            )}
            <LucideArrowRight />
            <span>List Board</span>
          </div>
        </HeaderLayout>
        <div className="flex items-center justify-center mr-3">
          <DropDownSettingProject projectId={projectId ?? ""} />
        </div>
      </div>

      <div className="w-full flex flex-col gap-6">
        <div className="flex justify-start w-full mb-4">
          <div className="relative w-full max-w-xs">
            <Input
              className="py-4 pl-10 pr-4 border border-zinc-300"
              placeholder="Search boards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <LucideSearch />
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7 w-full">
          <AnimatePresence mode="popLayout">
            {boards.map((board, index) => (
              <motion.div
                key={board.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05,
                }}
              >
                <Card
                  className="relative h-full rounded-2xl border border-zinc-200 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer"
                  onClick={() =>
                    navigate(`/${APP_ROUTES.BOARD}/${board.id}`, {
                      state: {
                        boardName: board.name,
                        projectId,
                        projectName: title,
                      },
                    })
                  }
                >
                  <div className="absolute right-3 top-5 z-10 rounded-md p-1 transition-colors hover:bg-gray-200 inline-flex items-center">
                    <MenuSettingBoard board={board} />
                  </div>
                  <BoardCard
                    name={board.name}
                    description={board.description}
                  />
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {boards.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full text-center p-14 border-2 border-dashed rounded-2xl border-zinc-300 bg-zinc-50"
            >
              <p className="text-zinc-500 font-medium text-lg">
                No suitable boards found.
              </p>
            </motion.div>
          )}
        </div>
      </div>
      {pagination && totalPage > 1 && (
        <div className="pagination mt-auto py-6">
          <PaginationLayout
            currentPage={page}
            totalPage={totalPage}
            onChangePage={(newPage) => {
              setPage(newPage);
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
          />
        </div>
      )}

      <div className="fixed bottom-30 right-20 z-50">
        <CreateBoardDialog />
      </div>
    </div>
  );
}
