import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { projectApi } from "../api/project-api";
import { projectKeys } from "../utils/project-query-keys";

export const useProjects = (page: number, limit: number, name?: string) => {
  return useQuery({
    queryKey: projectKeys.list(page, limit, name),
    queryFn: () => projectApi.getAll(page, limit, name),
    placeholderData: keepPreviousData,
  });
};
