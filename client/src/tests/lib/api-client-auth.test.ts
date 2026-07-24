import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/api-client";
import { clearCsrfToken } from "@/lib/csrf";

describe("cookie session API requests", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    clearCsrfToken();
    globalThis.fetch = originalFetch;
  });

  it("uses credentials and an in-memory CSRF header without a bearer header", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "csrf-token" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    globalThis.fetch = fetchMock;

    await apiRequest("/projects", { method: "POST", body: "{}" });

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      credentials: "include",
    });
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      credentials: "include",
    });
    expect(fetchMock.mock.calls[1][1].headers).toMatchObject({
      "X-CSRF-Token": "csrf-token",
      "Content-Type": "application/json",
    });
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });
});