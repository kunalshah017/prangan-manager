import { readFile } from "node:fs/promises";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

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
      MessageChannel,
      // Looked up per call so a test's fake timers apply.
      setTimeout: (...args: Parameters<typeof setTimeout>) => setTimeout(...args),
      clearTimeout: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
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

describe("public service worker policy", () => {
  it.each([
    ["same-origin API GET", { url: `${origin}/api/v1/users` }],
    ["POST request", { method: "POST" }],
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
    expect(caches.open).toHaveBeenCalledWith("prangan-runtime-v13");
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
    const currentCaches = ["prangan-static-v13", "prangan-runtime-v13", "prangan-pdfs-v3"];
    const priorCaches = [
      "prangan-static",
      "prangan-runtime",
      "prangan-static-v2",
      "prangan-runtime-v2",
      "prangan-static-v5",
      "prangan-runtime-v5",
      "prangan-static-v6",
      "prangan-runtime-v6",
      "prangan-static-v9",
      "prangan-runtime-v9",
      "prangan-pdfs-v2",
    ];
    const preservedCaches = ["unrelated-cache"];
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

    expect(source).toContain('const CACHE_VERSION = "v13";');
    expect(source).toContain(
      "const STATIC_CACHE = `prangan-static-${CACHE_VERSION}`;",
    );
    expect(source).toContain(
      "const RUNTIME_CACHE = `prangan-runtime-${CACHE_VERSION}`;",
    );
    expect(source).not.toContain("CACHE_NAME");
    expect(source).not.toMatch(/_CACHE = .*Date\.now/);
    expect(source).toContain('cacheName.startsWith("prangan-static")');
    expect(source).toContain('cacheName.startsWith("prangan-runtime")');
    expect(source).toContain('cacheName.startsWith("prangan-pdfs")');
    expect(source).toContain("cacheName !== STATIC_CACHE");
    expect(source).toContain("cacheName !== RUNTIME_CACHE");
    expect(source).toContain("cacheName !== PDF_CACHE");
  });
});

describe("coursebook cache", () => {
  const store = "https://abc.private.blob.vercel-storage.com";
  const DAY = 24 * 60 * 60 * 1000;

  const loadBookWorker = async (saved: Record<string, Response> = {}) => {
    const worker = await loadWorker();
    const stored = new Map(Object.entries(saved));
    const bookCache = {
      match: vi.fn(async (key: string) => stored.get(key)?.clone()),
      put: vi.fn(async (key: string, response: Response) => {
        stored.set(key, new Response(await response.arrayBuffer(), { headers: response.headers }));
      }),
    };
    worker.caches.open.mockResolvedValue(bookCache);
    worker.fetchMock.mockImplementation(async () => new Response("%PDF-1.7 book", { headers: { "Content-Length": "13" } }));

    const open = async (url: string, headers: string[] = []) => {
      let reply: Promise<Response> | undefined;
      const saving: Promise<unknown>[] = [];
      worker.listeners.get("fetch")?.({
        request: { ...workerRequest({ url }), headers: { has: (name: string) => headers.includes(name) } },
        respondWith: (value: Promise<Response>) => { reply = value; },
        waitUntil: (value: Promise<unknown>) => { saving.push(value); },
      });
      if (!reply) return undefined;
      const response = await reply;
      const body = await response.text();
      await Promise.all(saving);
      return { status: response.status, body };
    };
    return { ...worker, stored, bookCache, open };
  };

  it("downloads a book once and reopens it from the device under any signature", async () => {
    const { open, fetchMock, stored } = await loadBookWorker();

    expect(await open(`${store}/books/b1.pdf?vercel-blob-signature=first`)).toEqual({ status: 200, body: "%PDF-1.7 book" });
    expect(await open(`${store}/books/b1.pdf?vercel-blob-signature=second`)).toEqual({ status: 200, body: "%PDF-1.7 book" });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect([...stored.keys()]).toEqual([`${store}/books/b1.pdf`]);
  });

  it("downloads a book again after 30 days", async () => {
    const old = new Response("old", { headers: { "sw-cached-at": String(Date.now() - 31 * DAY) } });
    const { open, fetchMock } = await loadBookWorker({ [`${store}/books/b1.pdf`]: old });

    expect((await open(`${store}/books/b1.pdf?s=1`))?.body).toBe("%PDF-1.7 book");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not keep a refused link", async () => {
    const { open, fetchMock, bookCache } = await loadBookWorker();
    fetchMock.mockImplementation(async () => new Response("expired", { status: 403 }));

    expect((await open(`${store}/books/b1.pdf?s=old`))?.status).toBe(403);
    expect(bookCache.put).not.toHaveBeenCalled();
  });

  it("leaves page-range requests to the network", async () => {
    const { open, fetchMock } = await loadBookWorker();

    expect(await open(`${store}/books/b1.pdf?s=1`, ["Range"])).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("tapping a notification", () => {
  const tap = async (windows: unknown[]) => {
    const { listeners, clients } = await loadWorker();
    const openWindow = vi.fn().mockResolvedValue(undefined);
    Object.assign(clients, { matchAll: vi.fn().mockResolvedValue(windows), openWindow });
    let done: Promise<unknown> = Promise.resolve();
    const close = vi.fn();
    listeners.get("notificationclick")!({
      notification: { close, data: { href: "/users/u1/review" } },
      waitUntil: (work: Promise<unknown>) => {
        done = work;
      },
    });
    return { done, close, openWindow };
  };

  it("brings the open app forward and lets it move to the page without a reload", async () => {
    const calls: string[] = [];
    const app = {
      url: `${origin}/projects`,
      focus: vi.fn(async () => {
        calls.push("focus");
        return app;
      }),
      postMessage: vi.fn((message: { href: string }, [port]: MessagePort[]) => {
        calls.push(`message ${message.href}`);
        port.postMessage("opened");
      }),
      navigate: vi.fn().mockResolvedValue(undefined),
    };
    const { done, close, openWindow } = await tap([app]);
    await done;
    expect(close).toHaveBeenCalled();
    expect(calls).toEqual(["focus", "message /users/u1/review"]);
    expect(app.navigate).not.toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("sends the window to the page when the app doesn't answer, e.g. on the sign-in page", async () => {
    vi.useFakeTimers();
    try {
      const app = {
        url: `${origin}/login`,
        focus: vi.fn(async () => app),
        postMessage: vi.fn(),
        navigate: vi.fn().mockResolvedValue(undefined),
      };
      const { done } = await tap([app]);
      await vi.advanceTimersByTimeAsync(1500);
      await done;
      expect(app.navigate).toHaveBeenCalledWith(`${origin}/users/u1/review`);
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens a new window on the page when the app isn't open", async () => {
    const { done, openWindow } = await tap([]);
    await done;
    expect(openWindow).toHaveBeenCalledWith(`${origin}/users/u1/review`);
  });
});
