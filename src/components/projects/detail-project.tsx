import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, FolderOpen, Loader2, Search } from "lucide-react";

import { useBoards } from "@/features/boards/hooks/useBoards";
import { useBoardListCounts } from "@/features/boards/hooks/useBoardListCounts";
import { useBoardsMembers } from "@/features/boards/hooks/useBoardsMembers";
import { useEditTitleProject } from "@/features/projects/hooks/useEditTitleProject";
import { HeaderLayout } from "@/layouts/header-layout";
import { PaginationLayout } from "@/layouts/pagination-layout";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { APP_ROUTES } from "@/router/constans";

import { BoardCard } from "./boardCard-project";
import { CreateBoardButton } from "./createBoardButton-project";
import { MenuSettingBoard } from "./settingBoard-project";

interface DetailProjectLocationState {
  projectName?: string;
}

const EASE_FLUID = [0.32, 0.72, 0, 1] as const;
const PAGE_SIZE = 12;

export function DetailProject() {
  const reduceMotion = useReducedMotion();
  const location = useLocation();
  const { projectName: initialProjectName } =
    (location.state as DetailProjectLocationState | null) ?? {};

  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const boardGridRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { editing, setEditing, title, setTitle, handleSave, handleKeyBoard } =
    useEditTitleProject(projectId ?? "", initialProjectName || "Project");

  const {
    data: responseData,
    isLoading,
    isError,
  } = useBoards(projectId ?? "", page, PAGE_SIZE, debouncedSearch);

  const boards = useMemo(
    () => (Array.isArray(responseData?.data) ? responseData.data : []),
    [responseData],
  );
  const pagination = responseData?.pagination;
  const totalPage = pagination?.totalPages ?? 1;
  const totalItems = pagination?.totalItems ?? 0;

  const { getCount: getListCount, isLoading: isListCountLoading } =
    useBoardListCounts(boards);
  const { membersByBoardId } = useBoardsMembers(boards);

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
    boardGridRef.current?.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  if (!projectId) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] min-h-0 items-center justify-center overflow-hidden">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-4 text-[13.5px] text-destructive">
          Project id is missing.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] min-h-0 items-center justify-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE_FLUID }}
          className="flex flex-col items-center gap-3 text-muted-foreground"
        >
          <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" />
          <span className="text-[13px] tracking-tight">Loading boards</span>
        </motion.div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] min-h-0 items-center justify-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_FLUID }}
          className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-4 text-[13.5px] text-destructive"
        >
          Could not load boards. Please try again.
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="shrink-0">
        <HeaderLayout className="tracking-normal">
          <div className="flex min-w-0 items-center gap-2">
            {editing ? (
              <Input
                aria-label="Project title"
                autoFocus
                className="h-auto min-w-0 max-w-75 py-1 px-2 text-base font-semibold text-zinc-900 bg-zinc-100 border-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-md"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyBoard}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="cursor-pointer truncate rounded-md px-2 py-1 font-semibold text-foreground transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                title="Click to rename"
              >
                {title}
              </button>
            )}
            <ArrowRight
              className="size-4 shrink-0 text-muted-foreground/70"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="shrink-0 text-sm text-muted-foreground">
              Boards
            </span>
          </div>
        </HeaderLayout>
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE_FLUID, delay: 0.15 }}
        className="mt-8 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="relative w-full sm:max-w-xs pl-2">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70">
            <Search className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <Input
            aria-label="Search boards"
            placeholder="Search boards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-full border-border/80 bg-card pl-10 pr-4 text-[13.5px] shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground/70 hover:border-primary/20 focus-visible:border-primary/35 focus-visible:ring-4 focus-visible:ring-primary/10"
          />
        </div>

        <div className="flex items-center justify-end gap-4 pr-2">
          <div className="hidden items-center gap-3 text-xs font-medium text-muted-foreground sm:flex">
            <span>
              {totalItems} board{totalItems === 1 ? "" : "s"}
            </span>
            <span className="h-3 w-px bg-border" aria-hidden="true" />
            <span>
              Page {page} of {Math.max(totalPage, 1)}
            </span>
          </div>

          <CreateBoardButton projectId={projectId} />
        </div>
      </motion.div>

      <div
        ref={boardGridRef}
        className="mt-8 pt-2 grid min-h-0 w-full flex-1 content-start grid-cols-1 items-stretch gap-5 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <AnimatePresence mode="popLayout">
          {boards.map((board, index) => (
            <motion.div
              key={board.id}
              layout
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, y: 20, filter: "blur(6px)" }
              }
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={
                reduceMotion
                  ? undefined
                  : { opacity: 0, scale: 0.94, filter: "blur(4px)" }
              }
              transition={{
                duration: 0.5,
                delay: Math.min(index * 0.04, 0.4),
                ease: EASE_FLUID,
              }}
              whileHover={reduceMotion ? undefined : { y: -4 }}
              className="h-full"
            >
              <Card
                role="link"
                tabIndex={0}
                aria-label={`Open ${board.name}`}
                onClick={() =>
                  navigate(`/${APP_ROUTES.BOARD}/${board.id}`, {
                    state: {
                      boardName: board.name,
                      projectId,
                      projectName: title,
                    },
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/${APP_ROUTES.BOARD}/${board.id}`, {
                      state: {
                        boardName: board.name,
                        projectId,
                        projectName: title,
                      },
                    });
                  }
                }}
                className="group relative h-full min-h-36 cursor-pointer overflow-visible rounded-2xl border border-border/80 bg-card py-0 ring-1 ring-foreground/4 transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-border hover:ring-foreground/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <div className="absolute right-3.5 top-3.5 z-10">
                  <div className="rounded-full p-1 hover:bg-foreground/5">
                    <MenuSettingBoard board={board} projectId={projectId} />
                  </div>
                </div>
                <BoardCard
                  name={board.name}
                  description={board.description}
                  members={membersByBoardId[board.id] ?? []}
                  listCount={getListCount(board)}
                  isListCountLoading={isListCountLoading}
                />
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {boards.length === 0 && (
          <motion.div
            initial={
              reduceMotion ? false : { opacity: 0, y: 16, filter: "blur(8px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: EASE_FLUID }}
            className="col-span-full"
          >
            <div className="rounded-2xl border border-border/60 bg-card px-6 py-12 sm:py-16">
              <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FolderOpen
                    className="size-5"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>

                <h3 className="mt-4 font-heading text-[17px] font-semibold leading-tight text-foreground">
                  {debouncedSearch ? "No matches" : "No boards yet"}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                  {debouncedSearch
                    ? `Nothing matches "${debouncedSearch}". Try a different keyword.`
                    : "Create your first board from the button above."}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {pagination && totalPage > 1 && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex h-20 items-center justify-center bg-background **:data-[slot=pagination]:mt-0">
          <PaginationLayout
            currentPage={page}
            totalPage={totalPage}
            onChangePage={handleChangePage}
          />
        </div>
      )}
    </div>
  );
}
