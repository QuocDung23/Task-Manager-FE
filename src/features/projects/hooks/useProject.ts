import { useQuery } from "@tanstack/react-query"
import { projectApi } from "../api/project-api"
import { projectKeys } from "../utils/project-query-keys"

export const useProject = (id: string) => {
    return useQuery({
        queryKey: projectKeys.detail(id),
        queryFn: () => projectApi.getById(id),
        enabled: !!id
    })
}