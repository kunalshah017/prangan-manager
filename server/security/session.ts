import jwt from "jsonwebtoken";

type Environment = NodeJS.ProcessEnv;

export const SESSION_COOKIE_NAME = "prangan_session";
export const CSRF_COOKIE_NAME = "prangan_csrf";
// A session lasts 30 days from its last renewal. Active users are renewed at
// most once a day, so only people who stay away for 30 days sign in again.
// Password resets and admin changes still end sessions via sessionVersion.
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_RENEW_AFTER_SECONDS = 60 * 60 * 24;
const AZURE_PRODUCTION_CLIENT_ORIGINS = [
  "https://manager.pranganfoundation.org",
  "https://prangan-manager.vercel.app",
] as const;

const isProductionEnvironment = (environment: Environment): boolean =>
  environment.NODE_ENV === "production" ||
  Boolean(environment.WEBSITE_SITE_NAME || environment.WEBSITE_HOSTNAME);

const isAzureEnvironment = (environment: Environment): boolean =>
  Boolean(environment.WEBSITE_SITE_NAME || environment.WEBSITE_HOSTNAME);

export const getAllowedClientOrigin = (
  environment: Environment = process.env,
): string => {
  if (isAzureEnvironment(environment)) {
    return AZURE_PRODUCTION_CLIENT_ORIGINS[0];
  }

  if (environment.CLIENT_ORIGIN) {
    return environment.CLIENT_ORIGIN;
  }

  if (environment.NODE_ENV === "production") {
    throw new Error("CLIENT_ORIGIN is required in production");
  }

  return "http://localhost:5173";
};

export const getAllowedClientOrigins = (
  environment: Environment = process.env,
): string[] => {
  if (isAzureEnvironment(environment)) {
    return [
      ...new Set([
        ...AZURE_PRODUCTION_CLIENT_ORIGINS,
        ...(environment.CLIENT_ORIGIN ? [environment.CLIENT_ORIGIN] : []),
      ]),
    ];
  }

  if (environment.CLIENT_ORIGIN) {
    return [environment.CLIENT_ORIGIN];
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
    maxAge: SESSION_MAX_AGE_SECONDS,
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
    maxAge: SESSION_MAX_AGE_SECONDS,
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
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });

export const shouldRenewSession = (
  issuedAt: number,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean => nowSeconds - issuedAt >= SESSION_RENEW_AFTER_SECONDS;

export const readSessionToken = (
  token: string,
  environment: Environment = process.env,
): { userId: string; sessionVersion: number; issuedAt: number } | null => {
  try {
    const decoded = jwt.verify(token, getSessionSecret(environment));

    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "string" ||
      !Number.isInteger(decoded.sessionVersion) ||
      typeof decoded.iat !== "number"
    ) {
      return null;
    }

    return {
      userId: decoded.userId,
      sessionVersion: decoded.sessionVersion,
      issuedAt: decoded.iat,
    };
  } catch {
    return null;
  }
};
