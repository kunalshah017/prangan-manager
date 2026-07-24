import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("PWA recovery UI", () => {
  it("uses application prompts rather than native browser dialogs", async () => {
    const entry = await readFile(
      new URL("../../main.tsx", import.meta.url),
      "utf8",
    );
    const cacheModal = await readFile(
      new URL("../../components/CacheManagementModal.tsx", import.meta.url),
      "utf8",
    );
    const app = await readFile(
      new URL("../../App.tsx", import.meta.url),
      "utf8",
    );

    expect(entry).not.toContain("confirm(");
    expect(cacheModal).not.toContain("alert(");
    expect(cacheModal).not.toContain("confirm(");
    expect(cacheModal).toContain("toast.");
    expect(app).toContain("prangan:pwa-update");
    expect(app).toContain("navigator.serviceWorker.getRegistration()");
    expect(app).toContain("registration?.waiting");
    expect(app).toContain("ConfirmationModal");
    expect(app).not.toContain("@vercel/analytics");
    expect(app).not.toContain("<Analytics");
  });
});
