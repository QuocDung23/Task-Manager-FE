import { useQuery } from "@tanstack/react-query";
import { userApi } from "../api/user-api";
import { authStorage } from "@/features/auth/storage/auth-storage";
import { useSessionRestore } from "@/features/auth/hooks/session-restore";

export const useCurrentUser = () => {
  const token = authStorage.getToken();
  const { isLoading: isSessionLoading } = useSessionRestore();

  return useQuery({
    queryKey: ["current-user"],
    queryFn: () => userApi.getMe(),
    enabled: !!token && !isSessionLoading,
  });
};
