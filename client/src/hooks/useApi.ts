import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type {
  ProjectsResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  Project,
  CentersResponse,
  CreateCenterRequest,
  CreateCenterResponse,
  Center,
  CreateSemesterRequest,
  CreateSemesterResponse,
  Semester,
  User,
  UserDetailsResponse,
} from "@/types/api";

// Generic hook for API calls
interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

// Custom hook for making API calls
function useApiCall<T>(
  apiCall: () => Promise<{ data: T }>,
  options: UseApiOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall();
      setData(response.data);
      options.onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      options.onError?.(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall, options]);

  useEffect(() => {
    if (options.immediate) {
      execute().catch(() => {
        // Error is already handled in execute
      });
    }
  }, [options.immediate, execute]);

  return { data, loading, error, execute };
}

// Project Hooks
export const useProjects = (options?: UseApiOptions<ProjectsResponse>) => {
  return useApiCall(() => api.get<ProjectsResponse>("/projects"), options);
};

// Alternative approach for create project hook
export const useProjectMutations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = async (
    projectData: CreateProjectRequest
  ): Promise<CreateProjectResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<CreateProjectResponse>(
        "/projects/create",
        projectData
      );
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create project";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (
    id: string,
    projectData: Partial<CreateProjectRequest>
  ): Promise<Project> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.put<Project>(`/projects/${id}`, projectData);
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update project";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await api.delete(`/projects/${id}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete project";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createProject,
    updateProject,
    deleteProject,
    loading,
    error,
  };
};

// Center Hooks
export const useCenters = (options?: UseApiOptions<CentersResponse>) => {
  return useApiCall(() => api.get<CentersResponse>("/centers"), options);
};

export const useCenterMutations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCenter = async (
    centerData: CreateCenterRequest
  ): Promise<CreateCenterResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<CreateCenterResponse>(
        "/centers/create",
        centerData
      );
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create center";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCenter = async (
    id: string,
    centerData: Partial<CreateCenterRequest>
  ): Promise<Center> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.put<Center>(`/centers/${id}`, centerData);
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update center";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteCenter = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await api.delete(`/centers/${id}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete center";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createCenter,
    updateCenter,
    deleteCenter,
    loading,
    error,
  };
};

// Semester Hooks
export const useSemesterMutations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSemester = async (
    semesterData: CreateSemesterRequest
  ): Promise<CreateSemesterResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<CreateSemesterResponse>(
        "/semesters/create",
        semesterData
      );
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create semester";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSemester = async (
    id: string,
    semesterData: Partial<CreateSemesterRequest>
  ): Promise<Semester> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.put<Semester>(
        `/semesters/${id}`,
        semesterData
      );
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update semester";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteSemester = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await api.delete(`/semesters/${id}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete semester";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createSemester,
    updateSemester,
    deleteSemester,
    loading,
    error,
  };
};

// User/Registration Requests Hook (for admin functionality)
export const useRegistrationRequests = (
  options?: UseApiOptions<{ users: User[] }>
) => {
  // This would typically fetch pending registration requests
  // For now, we'll create a mock implementation
  return useApiCall(() => {
    // Mock API call - replace with actual endpoint when available
    return Promise.resolve({
      data: {
        users: [
          // Mock data for registration requests
        ],
      },
    });
  }, options);
};

// Generic data fetching hook
export const useApiData = <T>(endpoint: string, options?: UseApiOptions<T>) => {
  return useApiCall(() => api.get<T>(endpoint), options);
};

// Generic mutation hook
export const useApiMutation = <TRequest, TResponse>(
  method: "POST" | "PUT" | "DELETE",
  endpoint: string
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (data?: TRequest): Promise<TResponse> => {
    setLoading(true);
    setError(null);

    try {
      let response;
      switch (method) {
        case "POST":
          response = await api.post<TResponse>(endpoint, data);
          break;
        case "PUT":
          response = await api.put<TResponse>(endpoint, data);
          break;
        case "DELETE":
          response = await api.delete<TResponse>(endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Request failed";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
};

// User Management Hooks
export const useCurrentUser = (
  options?: UseApiOptions<UserDetailsResponse>
) => {
  return useApiCall(() => api.get<UserDetailsResponse>("/users/me"), options);
};

export const useUsers = (options?: UseApiOptions<{ users: User[] }>) => {
  return useApiCall(() => api.get<{ users: User[] }>("/users"), options);
};

export const usePendingUsers = (options?: UseApiOptions<{ users: User[] }>) => {
  return useApiCall(
    () => api.get<{ users: User[] }>("/users?status=PENDING"),
    options
  );
};

export const useUserMutations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveUser = async (userId: string): Promise<{ message: string }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.put<{ message: string }>(
        `/users/${userId}/approve`
      );
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to approve user";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const rejectUser = async (userId: string): Promise<{ message: string }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.put<{ message: string }>(
        `/users/${userId}/reject`
      );
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to reject user";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (
    userId: string,
    role: "USER" | "ADMIN"
  ): Promise<{ message: string }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.put<{ message: string }>(
        `/users/${userId}/role`,
        { role }
      );
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update user role";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    approveUser,
    rejectUser,
    updateUserRole,
    loading,
    error,
  };
};

export default useApiCall;
