import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
  Syllabus,
  SyllabusTopic,
  SyllabusStatistics,
  SyllabusProgressLog,
  CreateSyllabusRequest,
  UpdateSyllabusRequest,
  CreateSyllabusTopicRequest,
  BulkCreateTopicsRequest,
  UpdateSyllabusTopicRequest,
  UpdateTopicStatusRequest,
  SyllabusResponse,
  SyllabiResponse,
  SyllabusTopicResponse,
  SyllabusTopicsResponse,
  SyllabusStatisticsResponse,
  ProgressLogsResponse,
  MessageResponse,
} from "@/types/api";

// ============================================
// SYLLABUS QUERIES
// ============================================

export const useSyllabi = (filters?: {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  level?: string;
  isActive?: boolean;
}) => {
  return useQuery({
    queryKey: [...queryKeys.syllabi, filters],
    queryFn: async (): Promise<Syllabus[]> => {
      const params = new URLSearchParams();
      if (filters?.projectId) params.append("projectId", filters.projectId);
      if (filters?.centerId) params.append("centerId", filters.centerId);
      if (filters?.semesterId) params.append("semesterId", filters.semesterId);
      if (filters?.level) params.append("level", filters.level);
      if (filters?.isActive !== undefined)
        params.append("isActive", String(filters.isActive));

      const response = await api.get<SyllabiResponse>(
        `/syllabus?${params.toString()}`
      );
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useSyllabus = (
  id: string,
  options?: { includeTopics?: boolean; includeStats?: boolean }
) => {
  return useQuery({
    queryKey: [...queryKeys.syllabus(id), options],
    queryFn: async (): Promise<Syllabus> => {
      const params = new URLSearchParams();
      if (options?.includeTopics)
        params.append("includeTopics", String(options.includeTopics));
      if (options?.includeStats)
        params.append("includeStats", String(options.includeStats));

      const response = await api.get<SyllabusResponse>(
        `/syllabus/${id}?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!id,
  });
};

// ============================================
// SYLLABUS MUTATIONS
// ============================================

export const useCreateSyllabus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSyllabusRequest): Promise<Syllabus> => {
      const response = await api.post<SyllabusResponse>("/syllabus", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.syllabi });
    },
  });
};

export const useUpdateSyllabus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSyllabusRequest;
    }): Promise<Syllabus> => {
      const response = await api.put<SyllabusResponse>(`/syllabus/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.syllabus(variables.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.syllabi });
    },
  });
};

export const useDeleteSyllabus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      hard = false,
    }: {
      id: string;
      hard?: boolean;
    }): Promise<void> => {
      await api.delete<MessageResponse>(
        `/syllabus/${id}${hard ? "?hard=true" : ""}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.syllabi });
    },
  });
};

// ============================================
// TOPIC QUERIES
// ============================================

export const useSyllabusTopics = (filters?: {
  syllabusId?: string;
  parentId?: string | null;
  cycle?: string;
  status?: string;
  includeSubtopics?: boolean;
}) => {
  return useQuery({
    queryKey: [...queryKeys.syllabusTopics, filters],
    queryFn: async (): Promise<SyllabusTopic[]> => {
      const params = new URLSearchParams();
      if (filters?.syllabusId) params.append("syllabusId", filters.syllabusId);
      if (filters?.parentId !== undefined)
        params.append("parentId", filters.parentId || "");
      if (filters?.cycle) params.append("cycle", filters.cycle);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.includeSubtopics)
        params.append("includeSubtopics", String(filters.includeSubtopics));

      const response = await api.get<SyllabusTopicsResponse>(
        `/syllabus/topics?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!filters?.syllabusId,
    staleTime: 1 * 60 * 1000,
  });
};

export const useSyllabusTopic = (
  id: string,
  includeSubtopics: boolean = false
) => {
  return useQuery({
    queryKey: [...queryKeys.syllabusTopic(id), { includeSubtopics }],
    queryFn: async (): Promise<SyllabusTopic> => {
      const params = new URLSearchParams();
      if (includeSubtopics)
        params.append("includeSubtopics", String(includeSubtopics));

      const response = await api.get<SyllabusTopicResponse>(
        `/syllabus/topics/${id}?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!id,
  });
};

// ============================================
// TOPIC MUTATIONS
// ============================================

export const useCreateSyllabusTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreateSyllabusTopicRequest
    ): Promise<SyllabusTopic> => {
      const response = await api.post<SyllabusTopicResponse>(
        "/syllabus/topics",
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.syllabusTopics });
      queryClient.invalidateQueries({
        queryKey: queryKeys.syllabus(data.syllabusId),
      });
    },
  });
};

export const useBulkCreateTopics = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: BulkCreateTopicsRequest
    ): Promise<SyllabusTopic[]> => {
      const response = await api.post<SyllabusTopicsResponse>(
        "/syllabus/topics/bulk",
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.syllabusTopics });
      if (data.length > 0) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.syllabus(data[0].syllabusId),
        });
      }
    },
  });
};

export const useUpdateSyllabusTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSyllabusTopicRequest;
    }): Promise<SyllabusTopic> => {
      const response = await api.put<SyllabusTopicResponse>(
        `/syllabus/topics/${id}`,
        data
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.syllabusTopic(variables.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.syllabusTopics });
      queryClient.invalidateQueries({
        queryKey: queryKeys.syllabus(data.syllabusId),
      });
    },
  });
};

export const useUpdateTopicStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateTopicStatusRequest;
    }): Promise<SyllabusTopic> => {
      const response = await api.patch<SyllabusTopicResponse>(
        `/syllabus/topics/${id}/status`,
        data
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.syllabusTopic(variables.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.syllabusTopics });
      queryClient.invalidateQueries({
        queryKey: queryKeys.syllabus(data.syllabusId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.progressLogs });
    },
  });
};

export const useDeleteSyllabusTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete<MessageResponse>(`/syllabus/topics/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.syllabusTopics });
      queryClient.invalidateQueries({ queryKey: queryKeys.syllabi });
    },
  });
};

// ============================================
// STATISTICS & PROGRESS LOGS
// ============================================

export const useSyllabusStatistics = (filters?: {
  syllabusId?: string;
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  level?: string;
}) => {
  return useQuery({
    queryKey: [...queryKeys.syllabusStatistics, filters],
    queryFn: async (): Promise<SyllabusStatistics> => {
      const params = new URLSearchParams();
      if (filters?.syllabusId) params.append("syllabusId", filters.syllabusId);
      if (filters?.projectId) params.append("projectId", filters.projectId);
      if (filters?.centerId) params.append("centerId", filters.centerId);
      if (filters?.semesterId) params.append("semesterId", filters.semesterId);
      if (filters?.level) params.append("level", filters.level);

      const response = await api.get<SyllabusStatisticsResponse>(
        `/syllabus/statistics?${params.toString()}`
      );
      return response.data;
    },
    staleTime: 1 * 60 * 1000,
  });
};

export const useProgressLogs = (filters?: {
  topicId?: string;
  syllabusId?: string;
  startDate?: string;
  endDate?: string;
  updatedBy?: string;
}) => {
  return useQuery({
    queryKey: [...queryKeys.progressLogs, filters],
    queryFn: async (): Promise<SyllabusProgressLog[]> => {
      const params = new URLSearchParams();
      if (filters?.topicId) params.append("topicId", filters.topicId);
      if (filters?.syllabusId) params.append("syllabusId", filters.syllabusId);
      if (filters?.startDate) params.append("startDate", filters.startDate);
      if (filters?.endDate) params.append("endDate", filters.endDate);
      if (filters?.updatedBy) params.append("updatedBy", filters.updatedBy);

      const response = await api.get<ProgressLogsResponse>(
        `/syllabus/progress-logs?${params.toString()}`
      );
      return response.data;
    },
    staleTime: 30 * 1000,
  });
};
