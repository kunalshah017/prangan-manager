import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
  CreateSemesterRequest,
  CreateSemesterResponse,
  Semester,
} from "@/types/api";

// Semester Mutations (no list endpoint mentioned, so just mutations)
export const useCreateSemester = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      semesterData: CreateSemesterRequest
    ): Promise<CreateSemesterResponse> => {
      return api.post<CreateSemesterResponse>(
        "/semesters/create",
        semesterData
      );
    },
    onSuccess: () => {
      // Invalidate semesters if we had a list endpoint
      queryClient.invalidateQueries({ queryKey: queryKeys.semesters });
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
      return api.put<Semester>(`/semesters/${id}`, data);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.semester(variables.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.semesters });
    },
  });
};

export const useDeleteSemester = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return api.delete(`/semesters/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.semester(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.semesters });
    },
  });
};
