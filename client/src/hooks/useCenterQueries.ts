import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
  CentersResponse,
  CenterResponse,
  CreateCenterRequest,
  CreateCenterResponse,
  UpdateCenterResponse,
  MessageResponse,
  Center,
} from "@/types/api";

// Center Queries
export const useCenters = () => {
  return useQuery({
    queryKey: queryKeys.centers,
    queryFn: async (): Promise<Center[]> => {
      const response = await api.get<CentersResponse>("/centers");
      return response.centers;
    },
    staleTime: 5 * 60 * 1000, // Centers data stays fresh for 5 minutes
  });
};

export const useCenter = (id: string) => {
  return useQuery({
    queryKey: queryKeys.center(id),
    queryFn: async (): Promise<Center> => {
      const response = await api.get<CenterResponse>(`/centers/${id}`);
      return response.center;
    },
    enabled: !!id,
  });
};

export const useCentersByProject = (projectId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.centersByProject(projectId),
    queryFn: async (): Promise<Center[]> => {
      const response = await api.get<CentersResponse>(
        `/centers/project/${projectId}`,
      );
      return response.centers;
    },
    enabled: !!projectId && enabled,
    staleTime: 5 * 60 * 1000, // Centers data stays fresh for 5 minutes
  });
};

// Center Mutations
export const useCreateCenter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      centerData: CreateCenterRequest,
    ): Promise<CreateCenterResponse> => {
      return api.post<CreateCenterResponse>("/centers/create", centerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.centers });
      // Invalidate centers by project queries since the new center might be linked to a project
      queryClient.invalidateQueries({
        queryKey: ["centers", "project"],
      });
    },
  });
};

export const useUpdateCenter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateCenterRequest>;
    }): Promise<Center> => {
      const response = await api.put<UpdateCenterResponse>(
        `/centers/${id}`,
        data,
      );
      return response.center;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.center(variables.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.centers });
      // Also invalidate centers by project if the center has a projectId
      if (data.projectId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.centersByProject(data.projectId),
        });
      }
    },
  });
};

export const useDeleteCenter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<MessageResponse> => {
      return api.delete<MessageResponse>(`/centers/${id}`);
    },
    onSuccess: (_, id) => {
      // Get the center data before removal to know which project to invalidate
      const centerData = queryClient.getQueryData<Center>(queryKeys.center(id));

      queryClient.removeQueries({ queryKey: queryKeys.center(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.centers });

      // Also invalidate centers by project if we know the projectId
      if (centerData?.projectId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.centersByProject(centerData.projectId),
        });
      }
    },
  });
};
