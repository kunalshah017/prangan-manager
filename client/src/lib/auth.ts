import { api } from "@/lib/api";

// JWT payload interface (minimal for token validation only)
interface JWTPayload {
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

// Utility to check if a JWT token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) return true;

    const payload: JWTPayload = JSON.parse(atob(tokenParts[1]));
    const now = Date.now() / 1000;

    return payload.exp ? payload.exp < now : false;
  } catch {
    return true;
  }
};

// Utility to validate token with the server
export const validateToken = async (): Promise<boolean> => {
  try {
    // Try to make a request to a protected endpoint to validate the token
    // The token will be automatically added by the axios interceptor
    await api.get("/users/me");
    return true;
  } catch {
    return false;
  }
};
