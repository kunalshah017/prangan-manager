import axios from "axios";

// Base API URL - Update this according to your backend server
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://your-production-api.com/api/v1"
    : "http://localhost:4000/api/v1";

// Create axios instance with default configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("prangan_auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 - Unauthorized (token expired/invalid)
    if (error.response?.status === 401) {
      localStorage.removeItem("prangan_auth_token");
      localStorage.removeItem("prangan_user");
      // Redirect to login page
      window.location.href = "/login";
    }

    // Handle other common errors
    if (error.response?.status === 403) {
      console.error("Access forbidden - insufficient permissions");
    }

    if (error.response?.status >= 500) {
      console.error("Server error - please try again later");
    }

    return Promise.reject(error);
  }
);

export default api;
