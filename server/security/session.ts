import jwt from "jsonwebtoken";

type Environment = NodeJS.ProcessEnv;

export const SESSION_COOKIE_NAME = "prangan_session";
export const CSRF_COOKIE_NAME = "prangan_csrf";
const AZURE_PRODUCTION_CLIENT_ORIGINS = [
  "https://manager.pranganfoundation.org",
  "https://prangan-manager.vercel.app",
] as const;

const isProductionEnvironment = (environment: Environment): boolean =>
  environment.NODE_ENV === "production" ||
  Boolean(environment.WEBSITE_SITE_NAME || environment.WEBSITE_HOSTNAME);

export const getAllowedClientOrigin = (
  environment: Environment = process.env,
): string => {
  if (environment.CLIENT_ORIGIN) {
    return environment.CLIENT_ORIGIN;
  }

  if (environment.WEBSITE_SITE_NAME || environment.WEBSITE_HOSTNAME) {
    return AZURE_PRODUCTION_CLIENT_ORIGINS[0];
  }

  if (environment.NODE_ENV === "production") {
    throw new Error("CLIENT_ORIGIN is required in production");
  }

  return "http://localhost:5173";
};

export const getAllowedClientOrigins = (
  environment: Environment = process.env,
): string[] => {
  if (environment.CLIENT_ORIGIN) {
    return [environment.CLIENT_ORIGIN];
  }

  if (environment.WEBSITE_SITE_NAME || environment.WEBSITE_HOSTNAME) {
    return [...AZURE_PRODUCTION_CLIENT_ORIGINS];
  }

  return [getAllowedClientOrigin(environment)];
};

export const getSessionCookieOptions = (
  environment: Environment = process.env,
) => {
  const production = isProductionEnvironment(environment);

  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: 60 * 60 * 8,
  };
};

export const getCsrfCookieOptions = (
  environment: Environment = process.env,
) => {
  const production = isProductionEnvironment(environment);

  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: 60 * 60 * 8,
  };
};

const getSessionSecret = (environment: Environment): string => {
  if (!environment.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }

  return environment.JWT_SECRET;
};

export const createSessionToken = (
  userId: string,
  sessionVersion: number,
  environment: Environment = process.env,
): string =>
  jwt.sign({ userId, sessionVersion }, getSessionSecret(environment), {
    expiresIn: "8h",
  });

export const readSessionToken = (
  token: string,
  environment: Environment = process.env,
): { userId: string; sessionVersion: number } | null => {
  try {
    const decoded = jwt.verify(token, getSessionSecret(environment));

    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "string" ||
      !Number.isInteger(decoded.sessionVersion)
    ) {
      return null;
    }

    return {
      userId: decoded.userId,
      sessionVersion: decoded.sessionVersion,
    };
  } catch {
    return null;
  }
};
