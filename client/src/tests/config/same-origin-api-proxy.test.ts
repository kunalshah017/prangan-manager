import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("production API routing", () => {
  it("proxies API requests before the SPA fallback and uses a same-origin base", async () => {
    const [vercelConfigSource, apiClientSource] = await Promise.all([
      readFile(new URL("../../../vercel.json", import.meta.url), "utf8"),
      readFile(new URL("../../lib/api-client.ts", import.meta.url), "utf8"),
    ]);
    const vercelConfig = JSON.parse(vercelConfigSource) as {
      rewrites: Array<{ source: string; destination: string }>;
    };

    expect(vercelConfig.rewrites[0]).toEqual({
      source: "/api/v1/:path*",
      destination:
        "https://prangan-manager-api-awbfgggjadahbqc6.centralindia-01.azurewebsites.net/api/v1/:path*",
    });
    expect(vercelConfig.rewrites.at(-1)).toEqual({
      source: "/(.*)",
      destination: "/index.html",
    });
    expect(apiClientSource).toContain(
      'process.env.NODE_ENV === "production"\n    ? "/api/v1"',
    );
  });
});
