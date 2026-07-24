import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("service worker registration", () => {
  it("unregisters existing workers during Vite development", async () => {
    const source = await readFile(
      new URL("../../main.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("if (import.meta.env.DEV)");
    expect(source).toContain("navigator.serviceWorker.getRegistrations()");
    expect(source).toContain("registration.unregister()");
    expect(source).toContain("else if ('serviceWorker' in navigator)");
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
