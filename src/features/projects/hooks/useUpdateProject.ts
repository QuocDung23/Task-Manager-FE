import { useMutation, useQueryClient } from "@tanstack/react-query"
import { projectApi } from "../api/project-api"
import { toast } from "sonner"

export const useUpdateProject = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({id, data}: {id: string, data: any}) => projectApi.update(id, data),
        onSuccess: () => {
            toast.success('Update Successfully')
            queryClient.invalidateQueries({ queryKey: ['projects'] })
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Update Failed')
        }
    })
}