import { useQuery } from "@tanstack/react-query"
import { projectApi } from "../api/project-api"

export const useProjects = (page: number, limit: number, name?: string) => {
    return useQuery({
        queryKey: ['projects', page, limit, name],
        queryFn: () => projectApi.getAll(page, limit, name)
    })
}
