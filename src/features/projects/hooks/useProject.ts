import { useQuery } from "@tanstack/react-query"
import { projectApi } from "../api/project-api"

export const useProject = (id: string) => {
    return useQuery({
        queryKey: ['project', id],
        queryFn: () => projectApi.getById(id),
        enabled: !!id
    })
}