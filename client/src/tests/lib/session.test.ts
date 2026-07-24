import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/lib/query-client";
import {
  AUTH_STORE_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  clearClientSession,
  establishAuthenticatedSession,
  handleUnauthorizedResponse,
  isCurrentUserAuthenticated,
  isUnauthorizedResponseForCurrentSession,
  shouldFetchCurrentUser,
  shouldProbeCurrentUser,
} from "@/lib/session";
import type { User } from "@/types/api";

const createDependencies = (initialKeys: string[]) => {
  const values = new Set(initialKeys);
  const removedKeys: string[] = [];
  let clearCalls = 0;

  return {
    storage: {
      removeItem: (key: string) => {
        removedKeys.push(key);
        values.delete(key);
      },
    },
    queryCache: {
      clear: () => {
        clearCalls += 1;
      },
    },
    removedKeys,
    getClearCalls: () => clearCalls,
  };
};

describe("clearClientSession", () => {
  it("removes all auth storage and clears the query cache once", () => {
    const dependencies = createDependencies([
      "prangan_auth_token",
      "prangan_user",
      "prangan-auth-storage",
    ]);

    clearClientSession(dependencies);

    expect(dependencies.removedKeys).toEqual([
      "prangan_auth_token",
      "prangan_user",
      "prangan-auth-storage",
    ]);
    expect(dependencies.getClearCalls()).toBe(1);
  });

  it("attempts every removal when a storage key is absent", () => {
    const dependencies = createDependencies(["prangan_auth_token"]);

    clearClientSession(dependencies);

    expect(dependencies.removedKeys).toEqual([
      "prangan_auth_token",
      "prangan_user",
      "prangan-auth-storage",
    ]);
    expect(dependencies.getClearCalls()).toBe(1);
  });
});

describe("isUnauthorizedResponseForCurrentSession", () => {
  it.each([
    [1, 1, true],
    [1, 2, false],
    [0, 2, false],
  ])(
    "compares request generation %s with current generation %s",
    (requestGeneration, currentGeneration, expected) => {
      expect(
        isUnauthorizedResponseForCurrentSession(
          requestGeneration,
          currentGeneration,
        ),
      ).toBe(expected);
    },
  );
});

describe("shouldProbeCurrentUser", () => {
  it("probes only a previously authenticated session and never refetches an anonymous result", () => {
    expect(shouldProbeCurrentUser(false, false)).toBe(false);
    expect(shouldProbeCurrentUser(true, false)).toBe(true);
    expect(shouldProbeCurrentUser(true, true)).toBe(false);
  });
});

describe("shouldFetchCurrentUser", () => {
  it("does not probe cookie sessions from public pages", () => {
    expect(shouldFetchCurrentUser(false, false, false)).toBe(false);
    expect(shouldFetchCurrentUser(true, true, false)).toBe(true);
    expect(shouldFetchCurrentUser(true, true, true)).toBe(false);
  });
});

describe("isCurrentUserAuthenticated", () => {
  it("treats a restored current user as authenticated before store synchronization", () => {
    expect(isCurrentUserAuthenticated(true, false, false)).toBe(true);
    expect(isCurrentUserAuthenticated(false, true, true)).toBe(true);
    expect(isCurrentUserAuthenticated(false, false, false)).toBe(false);
  });
});

describe("handleUnauthorizedResponse", () => {
  it("clears and redirects when the rejected request belongs to the current session", () => {
    let clearCalls = 0;
    let redirectCalls = 0;

    handleUnauthorizedResponse({
      requestGeneration: 4,
      currentGeneration: 4,
      clearSession: () => {
        clearCalls += 1;
      },
      redirectToLogin: () => {
        redirectCalls += 1;
      },
    });

    expect(clearCalls).toBe(1);
    expect(redirectCalls).toBe(1);
  });

  it("does not clear or redirect when a stale request rejects a newer session", () => {
    let clearCalls = 0;
    let redirectCalls = 0;

    handleUnauthorizedResponse({
      requestGeneration: 4,
      currentGeneration: 5,
      clearSession: () => {
        clearCalls += 1;
      },
      redirectToLogin: () => {
        redirectCalls += 1;
      },
    });

    expect(clearCalls).toBe(0);
    expect(redirectCalls).toBe(0);
  });
});

describe("establishAuthenticatedSession", () => {
  it("replaces a mounted account observer before publishing the new auth state", () => {
    const userA: User = {
      id: "user-a",
      name: "Account A",
      firstName: "Account",
      email: "a@example.com",
      role: "USER",
      status: "APPROVED",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const userB: User = {
      ...userA,
      id: "user-b",
      name: "Account B",
      email: "b@example.com",
    };
    const values = new Map<string, string>([
      [AUTH_TOKEN_STORAGE_KEY, "token-a"],
      [AUTH_STORE_STORAGE_KEY, JSON.stringify({ user: userA })],
    ]);
    const storage = {
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
      getItem: (key: string) => values.get(key) ?? null,
    };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity } },
    });
    queryClient.setQueryData(queryKeys.currentUser, userA);
    queryClient.setQueryData(queryKeys.projects, [{ id: "account-a-project" }]);
    const observer = new QueryObserver<User>(queryClient, {
      queryKey: queryKeys.currentUser,
      queryFn: async () => userA,
    });
    const userBNotifications: User[] = [];
    const unsubscribe = observer.subscribe(({ data }) => {
      if (data?.id !== userB.id) return;
      userBNotifications.push(data);
      expect(storage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
    });
    let persistedAuth: User | undefined;

    expect(observer.getCurrentResult().data).toEqual(userA);

    establishAuthenticatedSession({
      user: userB,
      storage,
      queryClient,
      setAuth: (user) => {
        expect(storage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
        expect(storage.getItem(AUTH_STORE_STORAGE_KEY)).toBeNull();
        expect(queryClient.getQueryData(queryKeys.projects)).toBeUndefined();
        expect(queryClient.getQueryData(queryKeys.currentUser)).toEqual(userB);
        expect(observer.getCurrentResult().data).toEqual(userB);
        persistedAuth = user;
      },
    });

    expect(queryClient.getQueryData(queryKeys.currentUser)).toEqual(userB);
    expect(observer.getCurrentResult().data).toEqual(userB);
    expect(userBNotifications.length).toBeGreaterThan(0);
    expect(storage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(AUTH_STORE_STORAGE_KEY)).toBeNull();
    expect(persistedAuth).toEqual(userB);

    unsubscribe();
  });
});
