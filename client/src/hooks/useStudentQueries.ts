import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
  Student,
  StudentsResponse,
  StudentResponse,
  CreateStudentRequest,
  CreateStudentResponse,
  UpdateStudentRequest,
  UpdateStudentResponse,
  MessageResponse,
} from "@/types/api";

// Student Queries
export const useStudents = () => {
  return useQuery({
    queryKey: queryKeys.students,
    queryFn: async (): Promise<Student[]> => {
      const response = await api.get<StudentsResponse>("/users/students");
      return response.students;
    },
    staleTime: 2 * 60 * 1000, // Student data stays fresh for 2 minutes
  });
};

export const useStudent = (id: string) => {
  return useQuery({
    queryKey: ["students", id],
    queryFn: async (): Promise<Student> => {
      const response = await api.get<StudentResponse>(`/users/students/${id}`);
      return response.student;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useStudentsByLevel = (level: string) => {
  return useQuery({
    queryKey: ["students", "level", level],
    queryFn: async (): Promise<Student[]> => {
      const response = await api.get<StudentsResponse>(
        `/users/students/level/${level}`
      );
      return response.students;
    },
    enabled: !!level,
    staleTime: 2 * 60 * 1000,
  });
};

// Student Mutations
export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      studentData: CreateStudentRequest
    ): Promise<CreateStudentResponse> => {
      return api.post<CreateStudentResponse>("/users/students", studentData);
    },
    onSuccess: () => {
      // Invalidate and refetch students
      queryClient.invalidateQueries({ queryKey: queryKeys.students });
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...studentData
    }: UpdateStudentRequest & {
      id: string;
    }): Promise<UpdateStudentResponse> => {
      return api.put<UpdateStudentResponse>(
        `/users/students/${id}`,
        studentData
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate students list and specific student
      queryClient.invalidateQueries({ queryKey: queryKeys.students });
      queryClient.invalidateQueries({ queryKey: ["students", variables.id] });
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<MessageResponse> => {
      return api.delete<MessageResponse>(`/users/students/${id}`);
    },
    onSuccess: () => {
      // Invalidate students list
      queryClient.invalidateQueries({ queryKey: queryKeys.students });
    },
  });
};
