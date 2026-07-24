import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys, semesterSetupSummariesKey } from "@/lib/query-client";
import type {
  CreateSemesterRequest,
  CreateSemesterResponse,
  SemestersResponse,
  SemesterResponse,
  UpdateSemesterResponse,
  MessageResponse,
  Semester,
} from "@/types/api";

// Semester Queries
export const useSemesters = () => {
  return useQuery({
    queryKey: queryKeys.semesters,
    queryFn: async (): Promise<Semester[]> => {
      const response = await api.get<SemestersResponse>("/semesters");
      return response.semesters;
    },
    staleTime: 5 * 60 * 1000, // Semester data stays fresh for 5 minutes
  });
};

export const useSemester = (id: string) => {
  return useQuery({
    queryKey: queryKeys.semester(id),
    queryFn: async (): Promise<Semester> => {
      const response = await api.get<SemesterResponse>(`/semesters/${id}`);
      return response.semester;
    },
    enabled: !!id,
  });
};

export const useSemestersByCenter = (centerId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.semestersByCenter(centerId),
    queryFn: async (): Promise<Semester[]> => {
      const response = await api.get<SemestersResponse>(
        `/semesters/center/${centerId}`,
      );
      return response.semesters;
    },
    enabled: !!centerId && enabled,
    staleTime: 5 * 60 * 1000, // Semester data stays fresh for 5 minutes
  });
};

// Semester Mutations
export const useCreateSemester = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      semesterData: CreateSemesterRequest,
    ): Promise<CreateSemesterResponse> => {
      return api.post<CreateSemesterResponse>(
        "/semesters/create",
        semesterData,
      );
    },
    onSuccess: (response) => {
      // Invalidate semesters if we had a list endpoint
      queryClient.invalidateQueries({ queryKey: queryKeys.semesters });
      // Invalidate semesters by center queries since the new semester is linked to a center
      queryClient.invalidateQueries({
        queryKey: ["semesters", "center"],
      });
      queryClient.invalidateQueries({
        queryKey: semesterSetupSummariesKey(response.semester.centerId),
      });
    },
  });
};

export const useUpdateSemester = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateSemesterRequest>;
    }): Promise<Semester> => {
      const response = await api.put<UpdateSemesterResponse>(
        `/semesters/${id}`,
        data,
      );
      return response.semester;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.semester(variables.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.semesters });
      // Also invalidate semesters by center
      queryClient.invalidateQueries({
        queryKey: queryKeys.semestersByCenter(data.centerId),
      });
    },
  });
};

export const useDeleteSemester = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<MessageResponse> => {
      return api.delete<MessageResponse>(`/semesters/${id}`);
    },
    onSuccess: (_, id) => {
      // Get the semester data before removal to know which center to invalidate
      const semesterData = queryClient.getQueryData<Semester>(
        queryKeys.semester(id),
      );

      queryClient.removeQueries({ queryKey: queryKeys.semester(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.semesters });

      // Also invalidate semesters by center if we know the centerId
      if (semesterData?.centerId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.semestersByCenter(semesterData.centerId),
        });
      }
    },
  });
};
