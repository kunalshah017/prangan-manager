import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
  CentersResponse,
  CreateCenterRequest,
  CreateCenterResponse,
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
      return api.get<Center>(`/centers/${id}`);
    },
    enabled: !!id,
  });
};

// Center Mutations
export const useCreateCenter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      centerData: CreateCenterRequest
    ): Promise<CreateCenterResponse> => {
      return api.post<CreateCenterResponse>("/centers/create", centerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.centers });
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
      return api.put<Center>(`/centers/${id}`, data);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.center(variables.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.centers });
    },
  });
};

export const useDeleteCenter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return api.delete(`/centers/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.center(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.centers });
    },
  });
};
