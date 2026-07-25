import { describe, expect, it, vi } from "vitest";

import {
  readLastReadPage,
  writeLastReadPage,
} from "@/lib/book-progress";

describe("book reading progress", () => {
  it("stores progress independently for each book", () => {
    const storage = {
      getItem: vi.fn((key: string) =>
        key.endsWith("primary-a-semester-1") ? "27" : null,
      ),
      setItem: vi.fn(),
    };

    expect(readLastReadPage("primary-a-semester-1", storage)).toBe(27);
    expect(readLastReadPage("primary-a-semester-2", storage)).toBe(1);

    writeLastReadPage("primary-a-semester-2", 14, storage);
    expect(storage.setItem).toHaveBeenCalledWith(
      "prangan-library:last-read:primary-a-semester-2",
      "14",
    );
  });

  it("ignores invalid stored values and unsafe page updates", () => {
    const storage = {
      getItem: vi.fn(() => "not-a-page"),
      setItem: vi.fn(),
    };

    expect(readLastReadPage("primary-a-semester-1", storage)).toBe(1);
    writeLastReadPage("primary-a-semester-1", 0, storage);
    writeLastReadPage("primary-a-semester-1", 2.5, storage);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("falls back safely when browser storage is unavailable", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("storage blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("storage blocked");
      }),
    };

    expect(readLastReadPage("primary-a-semester-1", storage)).toBe(1);
    expect(() =>
      writeLastReadPage("primary-a-semester-1", 8, storage),
    ).not.toThrow();
  });

  it("survives browsers that block access to the storage getter", () => {
    vi.stubGlobal(
      "window",
      Object.defineProperty({}, "localStorage", {
        get: () => {
          throw new DOMException("Access denied", "SecurityError");
        },
      }),
    );

    expect(readLastReadPage("primary-a-semester-1")).toBe(1);
    expect(() =>
      writeLastReadPage("primary-a-semester-1", 8),
    ).not.toThrow();

    vi.unstubAllGlobals();
  });
});
