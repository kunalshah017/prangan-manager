import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("service worker registration", () => {
  it("runs a push-only worker during Vite development that never caches", async () => {
    const source = await readFile(
      new URL("../../main.tsx", import.meta.url),
      "utf8",
    );
    const worker = await readFile(
      new URL("../../../public/sw.js", import.meta.url),
      "utf8",
    );

    expect(source).toContain("if (import.meta.env.DEV)");
    expect(source).toContain("navigator.serviceWorker.register('/sw.js?dev')");
    expect(source).toContain("else if ('serviceWorker' in navigator)");
    // The dev worker skips precaching and never answers fetches.
    expect(worker.match(/if \(DEV_MODE\) return;/g)).toHaveLength(2);
  });

  it("surfaces an update that was already waiting when the app opened", async () => {
    const source = await readFile(
      new URL("../../main.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("if (registration.waiting)");
    expect(source).toContain("requestPwaRecovery('update', registration)");
  });
});
