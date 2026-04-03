import { useQuery } from "@tanstack/react-query";
import type { UserProjectPermissions } from "@construction/shared";
import { permissionApi } from "../../features/projects/api/permissionApi";
import { useAuthStore } from "../../store/authStore";

export function useProjectPermissions(projectId: string) {
  const cachedPermissions = useAuthStore((state) => state.projectPermissions[projectId]);
  const setProjectPermissions = useAuthStore((state) => state.setProjectPermissions);

  return useQuery({
    queryKey: ["permissions", projectId],
    queryFn: async () => {
      const permissions = await permissionApi.getProjectPermissions(projectId);
      setProjectPermissions(projectId, permissions);
      return permissions;
    },
    initialData: cachedPermissions as UserProjectPermissions | undefined,
    initialDataUpdatedAt: cachedPermissions ? Date.now() : undefined,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: Boolean(projectId),
  });
}

