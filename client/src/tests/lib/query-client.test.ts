import { afterEach, describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api-error";
import { queryClient, queryKeys } from "@/lib/query-client";

describe("queryClient defaults", () => {
  afterEach(() => {
    queryClient.clear();
  });

  it("disables mutation retries by default", () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it("retries ordinary query errors up to three times", () => {
    const retry = queryClient.getDefaultOptions().queries?.retry;

    expect(retry).toBeTypeOf("function");
    if (typeof retry !== "function") {
      throw new Error("Expected query retry to be a function");
    }

    expect(
      [0, 1, 2, 3].map((count) => retry(count, new Error("failed"))),
    ).toEqual([true, true, true, false]);
    expect(retry(0, new ApiError("not found", 404))).toBe(false);
    expect(retry(2, new ApiError("not found", 404))).toBe(false);
  });

  it("does not retry failed mutations", async () => {
    let calls = 0;
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: async () => {
        calls += 1;
        throw new Error("mutation failed");
      },
    });

    await expect(mutation.execute(undefined)).rejects.toThrow(
      "mutation failed",
    );
    expect(calls).toBe(1);
  });

  it("allows local mutation retry overrides", async () => {
    let calls = 0;
    const mutation = queryClient.getMutationCache().build(queryClient, {
      retry: 1,
      retryDelay: 0,
      mutationFn: async () => {
        calls += 1;
        throw new Error("mutation failed");
      },
    });

    await expect(mutation.execute(undefined)).rejects.toThrow(
      "mutation failed",
    );
    expect(calls).toBe(2);
  });

  it("provides managed and legacy student level query keys", () => {
    expect(queryKeys.studentsBySemesterLevel("semester-level-1")).toEqual([
      "students",
      "semester-level",
      "semester-level-1",
    ]);
    expect(queryKeys.studentsByLevel("LEVEL_1")).toEqual([
      "students",
      "level",
      "LEVEL_1",
    ]);
  });
});
