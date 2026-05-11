import { useQuery } from "@tanstack/react-query";
import { userApi } from "../api/user-api";
import { authStorage } from "@/features/auth/storage/auth-storage";

export const useCurrentUser = () => {
  const token = authStorage.getValidToken();

  return useQuery({
    queryKey: ["current-user"],
    queryFn: () => userApi.getMe(),
    enabled: !!token,
  });
};
