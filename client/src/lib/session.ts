import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "./query-client";
import type { User } from "../types/api";

export const AUTH_TOKEN_STORAGE_KEY = "prangan_auth_token";
export const LEGACY_USER_STORAGE_KEY = "prangan_user";
export const AUTH_STORE_STORAGE_KEY = "prangan-auth-storage";
let sessionGeneration = 0;

const SESSION_STORAGE_KEYS = [
  AUTH_TOKEN_STORAGE_KEY,
  LEGACY_USER_STORAGE_KEY,
  AUTH_STORE_STORAGE_KEY,
] as const;

type SessionStorage = Pick<Storage, "removeItem">;
type QueryCache = { clear: () => void };

export const isUnauthorizedResponseForCurrentSession = (
  requestGeneration: number,
  currentGeneration: number,
): boolean => requestGeneration === currentGeneration;

export const shouldProbeCurrentUser = (
  hasSessionHint: boolean,
  hasProbedSession: boolean,
): boolean => hasSessionHint && !hasProbedSession;

export const shouldFetchCurrentUser = (
  probeSession: boolean,
  hasSessionHint: boolean,
  hasProbedSession: boolean,
): boolean =>
  probeSession && shouldProbeCurrentUser(hasSessionHint, hasProbedSession);

export const isCurrentUserAuthenticated = (
  hasCurrentUser: boolean,
  isStoreAuthenticated: boolean,
  isCurrentUserLoading: boolean,
): boolean => hasCurrentUser || (isStoreAuthenticated && isCurrentUserLoading);

export const getSessionGeneration = (): number => sessionGeneration;

export const advanceSessionGeneration = (): number => {
  sessionGeneration += 1;
  return sessionGeneration;
};

export const handleUnauthorizedResponse = ({
  requestGeneration,
  currentGeneration,
  clearSession,
  redirectToLogin,
}: {
  requestGeneration: number;
  currentGeneration: number;
  clearSession: () => void;
  redirectToLogin: () => void;
}): void => {
  if (
    !isUnauthorizedResponseForCurrentSession(
      requestGeneration,
      currentGeneration,
    )
  ) {
    return;
  }

  advanceSessionGeneration();
  clearSession();
  redirectToLogin();
};

const clearSessionStorage = (storage: SessionStorage): void => {
  for (const key of SESSION_STORAGE_KEYS) {
    storage.removeItem(key);
  }
};

export const clearClientSession = ({
  storage,
  queryCache,
}: {
  storage: SessionStorage;
  queryCache: QueryCache;
}): void => {
  clearSessionStorage(storage);
  queryCache.clear();
};

export const establishAuthenticatedSession = ({
  user,
  storage,
  queryClient,
  setAuth,
}: {
  user: User;
  storage: SessionStorage;
  queryClient: QueryClient;
  setAuth: (user: User) => void;
}): void => {
  clearSessionStorage(storage);
  queryClient.setQueryData(queryKeys.currentUser, user);
  queryClient.clear();
  queryClient.setQueryData(queryKeys.currentUser, user);
  setAuth(user);
};
