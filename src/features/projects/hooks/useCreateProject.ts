import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProjectRequest } from "../types";
import { projectApi } from "../api/project-api";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";
import { applyProjectCreated } from "../utils/project-cache";
import { projectKeys } from "../utils/project-query-keys";

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProjectRequest) => projectApi.create(data),
    onSuccess: (response) => {
      toast.success("Create Successfully");
      if (response?.data) {
        applyProjectCreated(queryClient, response.data);
      } else {
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      }
    },
    onError: (error: ApiError) => {
        toast.error(error.response?.data?.message || 'Create Failed');
    }
  });
};
