import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { sortByJourneyOrder } from "@/lib/levels";
import { queryKeys } from "@/lib/query-client";
import type {
  AcademicLevel,
  AcademicLevelResponse,
  AcademicLevelsResponse,
  CreateAcademicLevelRequest,
  ReorderAcademicLevelsRequest,
  ReplaceSemesterLevelsRequest,
  SemesterLevel,
  SemesterLevelsResponse,
  UpdateAcademicLevelRequest,
} from "@/types/api";

type QueryOptions = {
  enabled?: boolean;
};

type AcademicLevelQueryOptions = QueryOptions & {
  includeArchived?: boolean;
};

type SemesterLevelQueryOptions = QueryOptions & {
  includeInactive?: boolean;
};

export const useAcademicLevels = (options: AcademicLevelQueryOptions = {}) => {
  const includeArchived = options.includeArchived ?? false;

  return useQuery({
    queryKey: queryKeys.academicLevels(includeArchived),
    queryFn: async (): Promise<AcademicLevel[]> => {
      const endpoint = includeArchived
        ? "/academic-levels?includeArchived=true"
        : "/academic-levels";
      const response = await api.get<AcademicLevelsResponse>(endpoint);
      return sortByJourneyOrder(response.levels);
    },
    enabled: options.enabled ?? true,
  });
};

export const useCreateAcademicLevel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAcademicLevelRequest) =>
      api.post<AcademicLevelResponse>("/academic-levels", data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.academicLevelsRoot,
      }),
  });
};

export const useUpdateAcademicLevel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateAcademicLevelRequest;
    }) => api.patch<AcademicLevelResponse>(`/academic-levels/${id}`, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.academicLevelsRoot,
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.semesters }),
      ]);
    },
  });
};

export const useReorderAcademicLevels = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ReorderAcademicLevelsRequest) =>
      api.put<AcademicLevelsResponse>("/academic-levels/order", data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.academicLevelsRoot,
      }),
  });
};

export const useSemesterLevels = (
  semesterId: string,
  options: SemesterLevelQueryOptions = {},
) => {
  const includeInactive = options.includeInactive ?? false;

  return useQuery({
    queryKey: queryKeys.semesterLevels(semesterId, includeInactive),
    queryFn: async (): Promise<SemesterLevel[]> => {
      const suffix = includeInactive ? "?includeInactive=true" : "";
      const response = await api.get<SemesterLevelsResponse>(
        `/semesters/${semesterId}/levels${suffix}`,
      );
      return sortByJourneyOrder(response.levels);
    },
    enabled: (options.enabled ?? true) && !!semesterId,
  });
};

export const useReplaceSemesterLevels = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      semesterId,
      data,
    }: {
      semesterId: string;
      data: ReplaceSemesterLevelsRequest;
    }) =>
      api.put<SemesterLevelsResponse>(`/semesters/${semesterId}/levels`, data),
    onSuccess: (_, { semesterId }) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.semesterLevelsRoot(semesterId),
      }),
  });
};
