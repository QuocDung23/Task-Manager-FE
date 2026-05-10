import { useQuery } from "@tanstack/react-query"
import { userApi } from "../api/user-api"

export const useUsers = (email?: string, status: string = "ACTIVE") => {
    return useQuery({
        queryKey: ['users',{ name: email, status}],
        queryFn: () => userApi.getAll(email, status),
        enabled: !!email && email.trim().length > 0,
    })
}