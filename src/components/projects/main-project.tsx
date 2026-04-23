import { useProjects } from "@/features/projects/hooks/useProject";
import { HeaderProject } from "./header-project";
import { Loader2, LucideFolderOpen, LucideSearch } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "react-router-dom";
import { CreateProjectDialog } from "./create-project";
import { useEffect, useState } from "react";
import { PaginationPageProject } from "./pagination-project";
import { Input } from "../ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { MenuSettingProject } from "./setting-project";

export function ViewProject() {
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
    data: responeData,
    isLoading,
    isError,
  } = useProjects(page, limit, debouncedSearch);
  const projects = Array.isArray(responeData?.data) ? responeData.data : [];
  const pagination = responeData?.pagination;
  const totalPage = pagination?.totalPages ?? 1;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }
  if (isError) {
    return <div className="p-8 text-red-500">Error loading project list!</div>;
  }

  return (
    <div className="flex flex-col flex-1 w-full gap-6">
      <div className="flex items-center justify-between w-full">
        <HeaderProject />
        <div>
          <CreateProjectDialog />
        </div>
      </div>

      {/* GRID DANH SÁCH PROJECT */}
      <div className="w-full flex flex-col gap-6">
        {/* Search Bar */}
        <div className="flex justify-start w-full mb-4">
          <div className="relative w-full max-w-xs">
            <Input
              className="py-4 pl-10 pr-4 border border-zinc-300"
              placeholder="Search projects..."
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
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05, // Hiệu ứng thác nước (stagger), card hiện ra lần lượt
                  ease: "easeOut",
                }}
              >
                <Card className="relative h-full rounded-2xl border border-zinc-200 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                  <div className="absolute right-3 top-5 z-10 rounded-md p-1 transition-colors hover:bg-gray-200 inline-flex items-center">
                    <MenuSettingProject project={project} />
                  </div>

                  <Link to={`/board/${project.id}`} className="block group">
                    <CardHeader className="p-6 pr-14 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <LucideFolderOpen className="h-6 w-6 text-primary" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-lg font-bold text-zinc-800 group-hover:text-primary">
                            {project.name}
                          </CardTitle>
                          <CardDescription className="mt-2 line-clamp-2 text-sm text-zinc-500">
                            {project.description || "Không có mô tả"}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Link>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Nếu không có kết quả, hiển thị thông báo với hiệu ứng mờ dần */}
          {projects.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full text-center p-14 border-2 border-dashed rounded-2xl border-zinc-300 bg-zinc-50"
            >
              <p className="text-zinc-500 font-medium text-lg">
                Không tìm thấy dự án phù hợp.
              </p>
            </motion.div>
          )}
        </div>
      </div>
      {pagination && totalPage > 1 && (
        <div className="pagination mt-auto py-6">
          <PaginationPageProject
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
    </div>
  );
}
