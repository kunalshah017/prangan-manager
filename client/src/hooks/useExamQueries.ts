import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  Exam,
  StudentExamScore,
  CreateExamRequest,
  UpdateExamRequest,
  CreateStudentScoreRequest,
  UpdateStudentScoreRequest,
  ExamStatistics,
} from "@/types/exam";

// ============================================
// EXAM QUERIES
// ============================================

/**
 * Fetch all exams with optional filters
 */
export const useExams = (filters?: {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  level?: string;
  isActive?: boolean;
}) => {
  return useQuery({
    queryKey: ["exams", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.projectId) params.append("projectId", filters.projectId);
      if (filters?.centerId) params.append("centerId", filters.centerId);
      if (filters?.semesterId) params.append("semesterId", filters.semesterId);
      if (filters?.level) params.append("level", filters.level);
      if (filters?.isActive !== undefined)
        params.append("isActive", String(filters.isActive));

      const response = await api.get<{ data: Exam[]; count: number }>(
        `/exams?${params.toString()}`
      );
      return response.data;
    },
    enabled:
      !!filters?.projectId && !!filters?.centerId && !!filters?.semesterId,
  });
};

/**
 * Fetch a single exam by ID
 */
export const useExam = (examId: string, includeScores = false) => {
  return useQuery({
    queryKey: ["exam", examId, includeScores],
    queryFn: async () => {
      const params = includeScores ? "?includeScores=true" : "";
      const response = await api.get<{ data: Exam }>(
        `/exams/${examId}${params}`
      );
      return response.data;
    },
    enabled: !!examId,
  });
};

/**
 * Fetch exam statistics
 */
export const useExamStatistics = (examId: string) => {
  return useQuery({
    queryKey: ["exam-statistics", examId],
    queryFn: async () => {
      const response = await api.get<{ data: ExamStatistics }>(
        `/exams/${examId}/statistics`
      );
      return response.data;
    },
    enabled: !!examId,
  });
};

// ============================================
// EXAM MUTATIONS
// ============================================

/**
 * Create a new exam
 */
export const useCreateExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExamRequest) => {
      const response = await api.post<{ message: string; data: Exam }>(
        "/exams",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    },
  });
};

/**
 * Update an exam
 */
export const useUpdateExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      examId,
      data,
    }: {
      examId: string;
      data: UpdateExamRequest;
    }) => {
      const response = await api.put<{ message: string; data: Exam }>(
        `/exams/${examId}`,
        data
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["exam", variables.examId] });
    },
  });
};

/**
 * Delete an exam
 */
export const useDeleteExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      examId,
      hard = false,
    }: {
      examId: string;
      hard?: boolean;
    }) => {
      const params = hard ? "?hard=true" : "";
      await api.delete<{ message: string }>(`/exams/${examId}${params}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    },
  });
};

// ============================================
// STUDENT SCORE QUERIES
// ============================================

/**
 * Fetch student scores with optional filters
 */
export const useStudentScores = (filters?: {
  examId?: string;
  studentId?: string;
  enrollmentId?: string;
}) => {
  return useQuery({
    queryKey: ["student-scores", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.examId) params.append("examId", filters.examId);
      if (filters?.studentId) params.append("studentId", filters.studentId);
      if (filters?.enrollmentId)
        params.append("enrollmentId", filters.enrollmentId);

      const response = await api.get<{
        data: StudentExamScore[];
        count: number;
      }>(`/exams/scores?${params.toString()}`);
      return response.data;
    },
    enabled: !!(filters?.examId || filters?.studentId || filters?.enrollmentId),
  });
};

/**
 * Fetch a single student score by ID
 */
export const useStudentScore = (scoreId: string) => {
  return useQuery({
    queryKey: ["student-score", scoreId],
    queryFn: async () => {
      const response = await api.get<{ data: StudentExamScore }>(
        `/exams/scores/${scoreId}`
      );
      return response.data;
    },
    enabled: !!scoreId,
  });
};

// ============================================
// STUDENT SCORE MUTATIONS
// ============================================

/**
 * Create a student exam score
 */
export const useCreateStudentScore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStudentScoreRequest) => {
      const response = await api.post<{
        message: string;
        data: StudentExamScore;
      }>("/exams/scores", data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["student-scores"] });
      queryClient.invalidateQueries({ queryKey: ["exam", data.examId] });
      queryClient.invalidateQueries({
        queryKey: ["exam-statistics", data.examId],
      });
    },
  });
};

/**
 * Bulk create student scores
 */
export const useBulkCreateStudentScores = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      examId: string;
      scores: Omit<CreateStudentScoreRequest, "examId">[];
    }) => {
      const response = await api.post<{
        message: string;
        data: StudentExamScore[];
      }>("/exams/scores/bulk", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["student-scores"] });
      queryClient.invalidateQueries({ queryKey: ["exam", variables.examId] });
      queryClient.invalidateQueries({
        queryKey: ["exam-statistics", variables.examId],
      });
    },
  });
};

/**
 * Update a student exam score
 */
export const useUpdateStudentScore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scoreId,
      data,
    }: {
      scoreId: string;
      data: UpdateStudentScoreRequest;
    }) => {
      const response = await api.put<{
        message: string;
        data: StudentExamScore;
      }>(`/exams/scores/${scoreId}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["student-scores"] });
      queryClient.invalidateQueries({ queryKey: ["student-score", data.id] });
      if (data.examId) {
        queryClient.invalidateQueries({ queryKey: ["exam", data.examId] });
        queryClient.invalidateQueries({
          queryKey: ["exam-statistics", data.examId],
        });
      }
    },
  });
};

/**
 * Delete a student score
 */
export const useDeleteStudentScore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scoreId: string) => {
      await api.delete<{ message: string }>(`/exams/scores/${scoreId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-scores"] });
    },
  });
};
