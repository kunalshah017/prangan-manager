import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
  ProjectsResponse,
  ProjectResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateProjectResponse,
  UpdateProjectResponse,
  MessageResponse,
  Project,
} from "@/types/api";

// Project Queries
export const useProjects = () => {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async (): Promise<Project[]> => {
      const response = await api.get<ProjectsResponse>("/projects");
      return response.projects;
    },
    staleTime: 2 * 60 * 1000, // Projects data stays fresh for 2 minutes
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: async (): Promise<Project> => {
      const response = await api.get<ProjectResponse>(`/projects/${id}`);
      return response.project;
    },
    enabled: !!id, // Only fetch if id is provided
  });
};

// Project Mutations
export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      projectData: CreateProjectRequest
    ): Promise<CreateProjectResponse> => {
      return api.post<CreateProjectResponse>("/projects/create", projectData);
    },
    onSuccess: () => {
      // Invalidate projects list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateProjectRequest;
    }): Promise<Project> => {
      const response = await api.put<UpdateProjectResponse>(
        `/projects/${id}`,
        data
      );
      return response.project;
    },
    onSuccess: (data, variables) => {
      // Update the specific project in cache
      queryClient.setQueryData(queryKeys.project(variables.id), data);
      // Invalidate projects list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<MessageResponse> => {
      return api.delete<MessageResponse>(`/projects/${id}`);
    },
    onSuccess: (_, id) => {
      // Remove the specific project from cache
      queryClient.removeQueries({ queryKey: queryKeys.project(id) });
      // Invalidate projects list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
};
