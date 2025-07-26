// API Configuration and base client
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

// Custom error class for API errors
export class ApiError extends Error {
  status: number;
  response?: unknown;

  constructor(message: string, status: number, response?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.response = response;
  }
}

// Base fetch wrapper with authentication and error handling
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("prangan_auth_token");

  // Only set Content-Type if there's a body to send
  const headers: HeadersInit = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers as Record<string, string>),
  };

  // Add Content-Type only if we're sending data
  if (options.body) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);

    // Handle different HTTP status codes
    if (response.status === 401) {
      // Unauthorized - clear auth data
      localStorage.removeItem("prangan_auth_token");
      localStorage.removeItem("prangan_user");
      window.location.href = "/login";

      // Try to get the API error message
      let errorMessage = "Unauthorized";
      try {
        const errorData = await response.json();
        if (typeof errorData.message === "string") {
          errorMessage = errorData.message;
        }
      } catch {
        // Keep default message if parsing fails
      }

      throw new ApiError(errorMessage, 401);
    }

    if (response.status === 403) {
      // Try to get the API error message
      let errorMessage = "Access forbidden - insufficient permissions";
      try {
        const errorData = await response.json();
        if (typeof errorData.message === "string") {
          errorMessage = errorData.message;
        }
      } catch {
        // Keep default message if parsing fails
      }

      throw new ApiError(errorMessage, 403);
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorData: Record<string, unknown> = {};

      try {
        errorData = await response.json();
        // Use the API's error message if available, otherwise use our default
        if (typeof errorData.message === "string") {
          errorMessage = errorData.message;
        } else if (typeof errorData.error === "string") {
          errorMessage = errorData.error;
        } else if (typeof errorData.details === "string") {
          errorMessage = errorData.details;
        }
      } catch {
        // If JSON parsing fails, keep the default HTTP error message
      }

      throw new ApiError(errorMessage, response.status, errorData);
    }

    // Return the JSON data
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : "Network error occurred",
      0
    );
  }
}

// HTTP method helpers
export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "GET" }),

  post: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: "DELETE" }),
};

export default api;
