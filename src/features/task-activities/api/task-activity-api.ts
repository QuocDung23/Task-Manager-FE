import { axiosLocal } from "@/services/axios";
import type { TaskActivityListResponse } from "../types";

export const taskActivityApi = {
  list: async (taskId: string, cursor?: string, limit = 20) => {
    const response = await axiosLocal.get<TaskActivityListResponse>(
      `/task/${taskId}/activities`,
      { params: { cursor, limit } },
    );
    return response.data;
  },
};
