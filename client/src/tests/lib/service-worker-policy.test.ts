import { readFile } from "node:fs/promises";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

import { shouldHandleServiceWorkerRequest } from "@/lib/service-worker-policy";

const origin = "https://prangan.example";

type WorkerEvent = Record<string, unknown>;
type WorkerListener = (event: WorkerEvent) => void;

const readWorker = () =>
  readFile(new URL("../../../public/sw.js", import.meta.url), "utf8");

const loadWorker = async (cacheNames: string[] = []) => {
  const listeners = new Map<string, WorkerListener>();
  const runtimeCache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const caches = {
    keys: vi.fn().mockResolvedValue(cacheNames),
    delete: vi.fn().mockResolvedValue(true),
    open: vi.fn().mockResolvedValue(runtimeCache),
    match: vi.fn().mockResolvedValue(undefined),
  };
  const response = { status: 200, clone: vi.fn() };
  response.clone.mockReturnValue(response);
  const fetchMock = vi.fn().mockResolvedValue(response);
  const clients = { claim: vi.fn().mockResolvedValue(undefined) };
  const self = {
    addEventListener: vi.fn((type: string, listener: WorkerListener) => {
      listeners.set(type, listener);
    }),
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    clients,
  };

  runInContext(
    await readWorker(),
    createContext({
      self,
      caches,
      fetch: fetchMock,
      location: { origin },
      URL,
      Response,
      console: { log: vi.fn() },
    }),
    { filename: "public/sw.js" },
  );

  return { listeners, caches, runtimeCache, fetchMock, clients };
};

const workerRequest = (
  overrides: Partial<{
    url: string;
    method: string;
    mode: string;
    destination: string;
    authorization: boolean;
  }> = {},
) => {
  const { authorization, ...requestOverrides } = overrides;

  return {
    url: `${origin}/dashboard-data.json`,
    method: "GET",
    mode: "cors",
    destination: "",
    headers: { has: vi.fn(() => authorization ?? false) },
    ...requestOverrides,
  };
};

const request = (
  overrides: Partial<
    Parameters<typeof shouldHandleServiceWorkerRequest>[0]
  > = {},
) => ({
  method: "GET",
  url: `${origin}/dashboard`,
  origin,
  destination: "",
  mode: "cors",
  hasAuthorization: false,
  ...overrides,
});

describe("shouldHandleServiceWorkerRequest", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "bypasses %s requests",
    (method) => {
      expect(shouldHandleServiceWorkerRequest(request({ method }))).toBe(false);
    },
  );

  it("bypasses external origins", () => {
    expect(
      shouldHandleServiceWorkerRequest(
        request({ url: "https://cdn.example/app.js" }),
      ),
    ).toBe(false);
  });

  it.each(["/api", "/api/", "/api/v1/users", "/api/v1/users?active=true"])(
    "bypasses same-origin API path %s",
    (pathname) => {
      expect(
        shouldHandleServiceWorkerRequest(
          request({ url: `${origin}${pathname}` }),
        ),
      ).toBe(false);
    },
  );

  it("does not treat an api-prefixed ordinary path as the API", () => {
    expect(
      shouldHandleServiceWorkerRequest(request({ url: `${origin}/apiary` })),
    ).toBe(true);
  });

  it("bypasses requests containing Authorization", () => {
    expect(
      shouldHandleServiceWorkerRequest(request({ hasAuthorization: true })),
    ).toBe(false);
  });

  it("bypasses PDF requests", () => {
    expect(
      shouldHandleServiceWorkerRequest(
        request({ url: `${origin}/documents/report.pdf` }),
      ),
    ).toBe(false);
  });

  it.each([
    "/@vite/client",
    "/src/main.tsx",
    "/node_modules/.vite/deps/react.js?v=stale",
  ])("bypasses Vite development module %s", (pathname) => {
    expect(
      shouldHandleServiceWorkerRequest(
        request({ url: `${origin}${pathname}` }),
      ),
    ).toBe(false);
  });

  it.each([
    ["script", "cors", "/assets/app.js"],
    ["style", "cors", "/assets/app.css"],
    ["image", "no-cors", "/images/logo.png"],
    ["font", "cors", "/fonts/app.woff2"],
    ["document", "navigate", "/dashboard"],
    ["", "cors", "/manifest.json"],
  ])(
    "handles eligible same-origin %s requests",
    (destination, mode, pathname) => {
      expect(
        shouldHandleServiceWorkerRequest(
          request({ url: `${origin}${pathname}`, destination, mode }),
        ),
      ).toBe(true);
    },
  );
});

describe("public service worker policy", () => {
  it.each([
    ["same-origin API GET", { url: `${origin}/api/v1/users` }],
    ["same-origin authorized GET", { authorization: true }],
    [
      "Vite optimized dependency",
      {
        url: `${origin}/node_modules/.vite/deps/react.js?v=stale`,
        destination: "script",
      },
    ],
  ])("bypasses a %s before interception", async (_name, overrides) => {
    const { listeners, caches, fetchMock } = await loadWorker();
    const respondWith = vi.fn();

    listeners.get("fetch")?.({
      request: workerRequest(overrides),
      respondWith,
    });

    expect(respondWith).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    for (const cacheMethod of Object.values(caches)) {
      expect(cacheMethod).not.toHaveBeenCalled();
    }
  });

  it("intercepts an eligible ordinary same-origin GET", async () => {
    const { listeners, caches, runtimeCache, fetchMock } = await loadWorker();
    let responsePromise: Promise<unknown> | undefined;
    const respondWith = vi.fn((value: Promise<unknown>) => {
      responsePromise = value;
    });

    listeners.get("fetch")?.({ request: workerRequest(), respondWith });

    expect(respondWith).toHaveBeenCalledOnce();
    await responsePromise;
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(caches.open).toHaveBeenCalledWith("prangan-runtime-v6");
    expect(runtimeCache.put).toHaveBeenCalledOnce();
  });

  it.each([
    ["navigation", { mode: "navigate", destination: "document" }],
    ["asset", { destination: "script" }],
    ["ordinary request", {}],
  ])(
    "returns a concrete offline response when a %s network request fails",
    async (_name, overrides) => {
      const { listeners, fetchMock } = await loadWorker();
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      let responsePromise: Promise<Response> | undefined;
      const respondWith = vi.fn((value: Promise<Response>) => {
        responsePromise = value;
      });

      listeners.get("fetch")?.({
        request: workerRequest(overrides),
        respondWith,
      });

      const response = await responsePromise;
      expect(response).toBeInstanceOf(Response);
      expect(response?.status).toBe(503);
    },
  );

  it("deletes only prior namespaced caches during activation", async () => {
    const currentCaches = ["prangan-static-v6", "prangan-runtime-v6"];
    const priorCaches = [
      "prangan-static",
      "prangan-runtime",
      "prangan-static-v2",
      "prangan-runtime-v2",
      "prangan-static-v5",
      "prangan-runtime-v5",
    ];
    const preservedCaches = ["prangan-pdfs-v2", "unrelated-cache"];
    const { listeners, caches, clients } = await loadWorker([
      ...currentCaches,
      ...preservedCaches,
      ...priorCaches,
    ]);
    let activationPromise: Promise<unknown> | undefined;
    const waitUntil = vi.fn((value: Promise<unknown>) => {
      activationPromise = value;
    });

    listeners.get("activate")?.({ waitUntil });

    expect(waitUntil).toHaveBeenCalledOnce();
    await activationPromise;
    expect(caches.delete.mock.calls.map(([cacheName]) => cacheName)).toEqual(
      priorCaches,
    );
    for (const cacheName of [...currentCaches, ...preservedCaches]) {
      expect(caches.delete).not.toHaveBeenCalledWith(cacheName);
    }
    expect(clients.claim).toHaveBeenCalledOnce();
  });

  it("places every bypass guard before fetch interception and cache lookup", async () => {
    const source = await readWorker();
    const fetchListener = source.indexOf('self.addEventListener("fetch"');
    const firstInterception = Math.min(
      source.indexOf("event.respondWith", fetchListener),
      source.indexOf("caches.", fetchListener),
    );

    expect(fetchListener).toBeGreaterThanOrEqual(0);
    expect(firstInterception).toBeGreaterThan(fetchListener);

    for (const guard of [
      'request.method !== "GET"',
      "url.origin !== location.origin",
      'url.pathname.endsWith(".pdf")',
      'url.pathname === "/api"',
      'url.pathname.startsWith("/api/")',
      'request.headers.has("Authorization")',
      'url.pathname.startsWith("/node_modules/.vite/")',
    ]) {
      const guardIndex = source.indexOf(guard, fetchListener);
      expect(guardIndex, `expected early guard: ${guard}`).toBeGreaterThan(
        fetchListener,
      );
      expect(
        guardIndex,
        `expected ${guard} before cache handling`,
      ).toBeLessThan(firstInterception);
    }
  });

  it("uses versioned app caches and only removes prior app cache versions", async () => {
    const source = await readWorker();

    expect(source).toContain('const CACHE_VERSION = "v6";');
    expect(source).toContain(
      "const STATIC_CACHE = `prangan-static-${CACHE_VERSION}`;",
    );
    expect(source).toContain(
      "const RUNTIME_CACHE = `prangan-runtime-${CACHE_VERSION}`;",
    );
    expect(source).not.toContain("CACHE_NAME");
    expect(source).not.toContain("Date.now()");
    expect(source).toContain('cacheName.startsWith("prangan-static")');
    expect(source).toContain('cacheName.startsWith("prangan-runtime")');
    expect(source).toContain("cacheName !== STATIC_CACHE");
    expect(source).toContain("cacheName !== RUNTIME_CACHE");
    expect(source).toContain("cacheName !== PDF_CACHE");
  });
});
