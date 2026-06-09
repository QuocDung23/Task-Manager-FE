import { LucideFolderOpen } from "lucide-react";
import { CardDescription, CardHeader, CardTitle } from "../ui/card";

interface ProjectCardProps {
  name: string;
  description?: string;
}

export function ProjectCard({ name, description }: ProjectCardProps) {
  return (
    <CardHeader className="p-6 pr-14 space-y-4">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <LucideFolderOpen className="h-6 w-6 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-lg font-bold text-zinc-800 group-hover:text-primary">
            {name}
          </CardTitle>
          <CardDescription className="mt-2 line-clamp-2 text-sm text-zinc-500">
            {description || "No description"}
          </CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}
