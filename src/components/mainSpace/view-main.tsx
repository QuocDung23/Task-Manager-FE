import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FolderOpen, Loader2, Search } from "lucide-react";

import { useProjects } from "@/features/projects/hooks/useProjects";
import { useProjectBoardCounts } from "@/features/projects/hooks/useProjectBoardCounts";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_ROUTES } from "@/router/constans";

import { HeaderLayout } from "@/layouts/header-layout";
import { PaginationLayout } from "@/layouts/pagination-layout";
import { CreateProjectButton } from "./createProjectButton-main";
import { MenuSettingProject } from "./settingProject-main";
import { ProjectCard } from "./projectCard-main";

const EASE_FLUID = [0.32, 0.72, 0, 1] as const;
const PAGE_SIZE = 12;

export function ViewMainPage() {
  const reduceMotion = useReducedMotion();
  const projectGridRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);

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
    data: responeData,
    isLoading,
    isError,
  } = useProjects(page, PAGE_SIZE, debouncedSearch);
  const projects = useMemo(
    () => (Array.isArray(responeData?.data) ? responeData.data : []),
    [responeData],
  );
  const { getCount: getBoardCount, isLoading: isBoardCountLoading } =
    useProjectBoardCounts(projects);
  const pagination = responeData?.pagination;
  const totalPage = pagination?.totalPages ?? 1;
  const totalItems = pagination?.totalItems ?? 0;

  const handleChangePage = (newPage: number): void => {
    setPage(newPage);
    projectGridRef.current?.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

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
          <span className="text-[13px] tracking-tight">Loading projects</span>
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
          Could not load projects. Please try again.
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="shrink-0">
        <HeaderLayout className="tracking-normal">Projects</HeaderLayout>
      </div>

      {/* Toolbar: search + create */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE_FLUID, delay: 0.15 }}
        className="mt-8 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70">
            <Search className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <Input
            className="h-11 w-full rounded-full border-border/80 bg-card pl-10 pr-4 text-[13.5px] shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground/70 hover:border-primary/20 focus-visible:border-primary/35 focus-visible:ring-4 focus-visible:ring-primary/10"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-4 sm:justify-end pr-2">
          <div className="hidden items-center gap-3 text-xs font-medium text-muted-foreground sm:flex">
            <span>
              {totalItems} project{totalItems === 1 ? "" : "s"}
            </span>
            <span className="h-3 w-px bg-border" aria-hidden="true" />
            <span>
              Page {page} of {Math.max(totalPage, 1)}
            </span>
          </div>
          <CreateProjectButton />
        </div>
      </motion.div>

      <div
        ref={projectGridRef}
        className="mt-8 pt-2 grid min-h-0 w-full flex-1 content-start grid-cols-1 items-stretch gap-5 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <AnimatePresence mode="popLayout">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
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
              <Card className="group relative h-full min-h-36 overflow-visible rounded-2xl border border-border/80 bg-card py-0 ring-1 ring-foreground/4 transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-border hover:ring-foreground/8">
                <div className="absolute right-3.5 top-3.5 z-10">
                  <div className="rounded-full p-1 hover:bg-foreground/5">
                    <MenuSettingProject project={project} />
                  </div>
                </div>
                <Link
                  to={`${APP_ROUTES.PROJECT}/${project.id}`}
                  state={{ projectName: project.name }}
                  className="block"
                >
                  <ProjectCard
                    name={project.name}
                    description={project.description}
                    members={project.members}
                    boardCount={getBoardCount(project)}
                    isBoardCountLoading={isBoardCountLoading}
                  />
                </Link>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {projects.length === 0 && (
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
                  {debouncedSearch ? "No matches" : "No projects yet"}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                  {debouncedSearch
                    ? `Nothing matches "${debouncedSearch}". Try a different keyword.`
                    : "Start your first workspace from the button above."}
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
