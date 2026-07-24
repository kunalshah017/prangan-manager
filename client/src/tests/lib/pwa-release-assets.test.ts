import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const publicFile = (name: string) =>
  new URL(`../../../public/${name}`, import.meta.url);

const pngDimensions = async (name: string) => {
  const image = await readFile(publicFile(name));
  expect(image.subarray(1, 4).toString()).toBe("PNG");
  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
  };
};

describe("PWA 2.1.1 release assets", () => {
  it("publishes the release version and rotates the application cache", async () => {
    const [packageJson, worker] = await Promise.all([
      readFile(new URL("../../../package.json", import.meta.url), "utf8"),
      readFile(publicFile("sw.js"), "utf8"),
    ]);

    expect(JSON.parse(packageJson).version).toBe("2.1.1");
    expect(worker).toContain('const CACHE_VERSION = "v5";');
  });

  it("declares real any-purpose and maskable square icons", async () => {
    const manifest = JSON.parse(
      await readFile(publicFile("manifest.json"), "utf8"),
    ) as {
      icons: Array<{
        src: string;
        sizes: string;
        type: string;
        purpose: string;
      }>;
    };

    expect(manifest.icons).toEqual([
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/pwa-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ]);
  });

  it.each([
    ["pwa-icon-192.png", 192],
    ["pwa-icon-512.png", 512],
    ["pwa-maskable-192.png", 192],
    ["pwa-maskable-512.png", 512],
    ["apple-touch-icon.png", 180],
  ])("ships %s at its declared square size", async (name, size) => {
    await expect(pngDimensions(name)).resolves.toEqual({
      width: size,
      height: size,
    });
  });

  it("uses the dedicated install icons in HTML and the service worker", async () => {
    const [html, worker] = await Promise.all([
      readFile(new URL("../../../index.html", import.meta.url), "utf8"),
      readFile(publicFile("sw.js"), "utf8"),
    ]);

    expect(html).toContain('href="/apple-touch-icon.png"');
    expect(html).toContain('sizes="192x192" href="/pwa-icon-192.png"');
    expect(html).toContain('sizes="512x512" href="/pwa-icon-512.png"');
    for (const icon of [
      "/pwa-icon-192.png",
      "/pwa-icon-512.png",
      "/pwa-maskable-192.png",
      "/pwa-maskable-512.png",
      "/apple-touch-icon.png",
    ]) {
      expect(worker).toContain(`"${icon}"`);
    }
  });

  it("waits for user confirmation before activating an update", async () => {
    const worker = await readFile(publicFile("sw.js"), "utf8");
    const install = worker.slice(
      worker.indexOf('self.addEventListener("install"'),
      worker.indexOf('self.addEventListener("activate"'),
    );
    const messages = worker.slice(
      worker.indexOf('self.addEventListener("message"'),
    );

    expect(install).not.toContain("self.skipWaiting()");
    expect(messages).toContain("self.skipWaiting()");
  });
});
