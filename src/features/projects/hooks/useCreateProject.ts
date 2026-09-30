import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateProjectDto } from "../types";
import { projectApi } from "../api/project-api";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";
import { applyProjectCreated } from "../utils/project-cache";
import { projectKeys } from "../utils/project-query-keys";

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectDto) => projectApi.create(data),
    onSuccess: (response) => {
      toast.success(t("toast.created"));
      if (response?.data) {
        applyProjectCreated(queryClient, response.data);
      }
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    onError: (error: ApiError) => {
        toast.error(getApiErrorMessage(error, 'Create Failed'));
    }
  });
};
