import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { projectApi } from "../api/project-api"
import { toast } from "sonner"
import type { UpdateProjectDto } from "../types"
import type { ApiError } from "@/lib/api-error"
import { applyProjectUpdated } from "../utils/project-cache"
import { projectKeys } from "../utils/project-query-keys"

export const useUpdateProject = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({id, data}: {id: string, data: UpdateProjectDto}) => projectApi.update(id, data),
        onSuccess: (response, variables) => {
            toast.success(t("toast.updated"))
            if (response?.data) {
                applyProjectUpdated(queryClient, response.data)
            }
            queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) })
        },
        onError: (error: ApiError) => {
            toast.error(getApiErrorMessage(error, 'Update Failed'))
        }
    })
}
