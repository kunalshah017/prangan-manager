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
  StudentEnrollmentsResponse,
  StudentEnrollment,
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

export const useStudentsBySemesterLevel = (semesterLevelId: string) => {
  return useQuery({
    queryKey: queryKeys.studentsBySemesterLevel(semesterLevelId),
    queryFn: async (): Promise<Student[]> => {
      const response = await api.get<StudentsResponse>(
        `/users/students/semester-level/${semesterLevelId}`,
      );
      return response.students;
    },
    enabled: !!semesterLevelId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useStudentsBySemester = (
  semesterId: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ["students", "semester", semesterId],
    queryFn: async (): Promise<Student[]> => {
      const response = await api.get<StudentEnrollmentsResponse>(
        `/users/students/semester/${semesterId}`,
      );
      // Extract students from enrollments and preserve the canonical level relation.
      return response.enrollments.map((enrollment) => ({
        ...enrollment.student!,
        semesterLevelId: enrollment.semesterLevelId,
        semesterLevel: enrollment.semesterLevel,
      }));
    },
    enabled: options?.enabled ?? !!semesterId,
    staleTime: 2 * 60 * 1000,
  });
};

// New hook for getting student enrollments by semester
export const useStudentEnrollmentsBySemester = (
  semesterId: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ["enrollments", "semester", semesterId],
    queryFn: async (): Promise<StudentEnrollment[]> => {
      const response = await api.get<StudentEnrollmentsResponse>(
        `/users/students/semester/${semesterId}`,
      );
      return response.enrollments;
    },
    enabled: options?.enabled ?? !!semesterId,
    staleTime: 2 * 60 * 1000,
  });
};

// Student Mutations
export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      studentData: CreateStudentRequest,
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
        studentData,
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate students list and specific student
      queryClient.invalidateQueries({ queryKey: queryKeys.students });
      queryClient.invalidateQueries({ queryKey: ["students", variables.id] });

      // Invalidate semester-specific student queries
      queryClient.invalidateQueries({ queryKey: ["students", "semester"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments", "semester"] });

      // Invalidate student attendance queries that might be affected
      queryClient.invalidateQueries({
        queryKey: ["students", "semester", undefined, "attendance"],
      });
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

// Enrollment Management Queries
export const useStudentEnrollments = (studentId: string) => {
  return useQuery({
    queryKey: ["students", studentId, "enrollments"],
    queryFn: async (): Promise<{
      all: StudentEnrollment[];
      active: StudentEnrollment[];
      inactive: StudentEnrollment[];
    }> => {
      const response = await api.get<{
        message: string;
        enrollments: {
          all: StudentEnrollment[];
          active: StudentEnrollment[];
          inactive: StudentEnrollment[];
        };
      }>(`/users/students/${studentId}/enrollments`);
      return response.enrollments;
    },
    enabled: !!studentId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Enrollment Mutations
export const useCreateEnrollment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      ...enrollmentData
    }: {
      studentId: string;
      centerId: string;
      semesterId: string;
      projectId: string;
      semesterLevelId: string;
    }): Promise<{ message: string; enrollment: StudentEnrollment }> => {
      return api.post(
        `/users/students/${studentId}/enrollments`,
        enrollmentData,
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate enrollments for this student
      queryClient.invalidateQueries({
        queryKey: ["students", variables.studentId, "enrollments"],
      });
      // Invalidate student data as level might have changed
      queryClient.invalidateQueries({
        queryKey: ["students", variables.studentId],
      });
      // Invalidate semester enrollments
      queryClient.invalidateQueries({ queryKey: ["enrollments", "semester"] });
      queryClient.invalidateQueries({ queryKey: ["students", "semester"] });
    },
  });
};

export const useUpdateEnrollment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      enrollmentId,
      ...enrollmentData
    }: {
      enrollmentId: string;
      studentId: string;
      centerId?: string;
      semesterId?: string;
      projectId?: string;
      semesterLevelId?: string;
      isActive?: boolean;
    }): Promise<{ message: string; enrollment: StudentEnrollment }> => {
      return api.put(
        `/users/students/enrollments/${enrollmentId}`,
        enrollmentData,
      );
    },
    onSuccess: (data, variables) => {
      // Get studentId from the returned enrollment data
      const studentId = data.enrollment.studentId || variables.studentId;

      // Invalidate enrollments for this student
      queryClient.invalidateQueries({
        queryKey: ["students", studentId, "enrollments"],
      });
      // Invalidate student data
      queryClient.invalidateQueries({
        queryKey: ["students", studentId],
      });
      // Invalidate semester enrollments
      queryClient.invalidateQueries({ queryKey: ["enrollments", "semester"] });
      queryClient.invalidateQueries({ queryKey: ["students", "semester"] });
    },
  });
};

export const useDeleteEnrollment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      enrollmentId,
    }: {
      enrollmentId: string;
      studentId: string; // Keep for type safety in component
    }): Promise<MessageResponse> => {
      return api.delete(`/users/students/enrollments/${enrollmentId}`);
    },
    onSuccess: (_, variables) => {
      // Invalidate enrollments for this student
      queryClient.invalidateQueries({
        queryKey: ["students", variables.studentId, "enrollments"],
      });
      // Invalidate student data
      queryClient.invalidateQueries({
        queryKey: ["students", variables.studentId],
      });
      // Invalidate semester enrollments
      queryClient.invalidateQueries({ queryKey: ["enrollments", "semester"] });
      queryClient.invalidateQueries({ queryKey: ["students", "semester"] });
    },
  });
};
