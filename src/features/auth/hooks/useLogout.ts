import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth-api";
import { toast } from "sonner";
import { authStorage } from "../storage/auth-storage";

export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      authStorage.clearToken();
      queryClient.clear();
      toast.success("Logout Successfully");
      navigate("/login", { replace: true });
    },
  });
};
