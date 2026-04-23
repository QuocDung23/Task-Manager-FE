import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProjectRequest } from "../types";
import { projectApi } from "../api/project-api";
import { toast } from "sonner";

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProjectRequest) => projectApi.create(data),
    onSuccess: () => {
      toast.success("Create Successfully");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error: any) => {
        toast.error(error.response.data.message || 'Create Failed')
    }
  });
};
