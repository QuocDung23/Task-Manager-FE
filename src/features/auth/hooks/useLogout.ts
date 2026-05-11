import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth-api";
import { toast } from "sonner";

export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      (localStorage.removeItem("accessToken"),
        localStorage.removeItem("refreshToken"),
        queryClient.clear());

      toast.success("Logout");
      navigate("/login", { replace: true });
    },
  });
};
