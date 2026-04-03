import api from "../../../config/api";
import type { UserProjectPermissions } from "@construction/shared";

interface ApiSingleResponse<T> {
  success: true;
  data: T;
}

export const permissionApi = {
  async getProjectPermissions(projectId: string) {
    const res = await api.get<ApiSingleResponse<UserProjectPermissions>>(`/permissions/${projectId}`);
    return res.data.data;
  },
};

