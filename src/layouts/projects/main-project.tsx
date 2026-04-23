import { useProjects } from "@/features/projects/hooks/useProject";
import { Loader2, LucideFolderOpen } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "react-router-dom";
import { CreateProjectDialog } from "./create-project";
import { useState } from "react";
import { PaginationPageProject } from "./pagination-project";
import { HeaderProject } from "@/components/projects/header-project";

export function ViewProject() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data: responeData, isLoading, isError } = useProjects(page, limit);
  const projects = Array.isArray(responeData?.data) ? responeData.data : [];
  const pagination = responeData?.pagination
  const totalPage = pagination?.totalPages ?? 1

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }
  if (isError) {
    return <div className="p-8 text-red-500">Lỗi khi tải danh sách dự án!</div>;
  }

  return (
    <div className="flex flex-col flex-1 w-full gap-6">
      {/* KHU VỰC HEADER: Dùng flex để đẩy nút sang bên phải */}
      <div className="flex items-center justify-between w-full">
        <HeaderProject />
        <div>
        <CreateProjectDialog />
      </div>
      </div>

      {/* GRID DANH SÁCH PROJECT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
        {projects.map((project) => (
          <Link key={project.id} to={`/board/${project.id}`} className="block">
          <Card className="h-full rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                  <LucideFolderOpen className="h-5 w-5 text-zinc-600" />
                </div>
        
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base font-semibold text-zinc-900 truncate">
                    {project.name}
                  </CardTitle>
        
                  <CardDescription className="mt-1 text-sm text-zinc-500 line-clamp-2">
                    {project.description || "Không có mô tả"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
        ))}

        {/* Thông báo nếu chưa có project */}
        {projects.length === 0 && (
          <div className="col-span-full text-center p-12 border border-dashed rounded-xl border-zinc-800">
            <p className="text-zinc-500">
              Bạn chưa có dự án nào. Bấm nút phía trên để tạo nhé!
            </p>
          </div>
        )}
      </div>
      {pagination && totalPage > 1 && (
        <div className="pagination mt-auto py-6">
            <PaginationPageProject
                currentPage={page}
                totalPage={totalPage}
                onChangePage={(newPage) => {
                    setPage(newPage)
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth',
                    })
                }}
            />
        </div>
      )}
    </div>
  );
}
