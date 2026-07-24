import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const appUrl = "https://manager.pranganfoundation.org/";
const imageUrl = `${appUrl}og-prangan-manager.png`;
const description =
  "Manage centres, semesters, students, educators, attendance, curriculum and remuneration in one secure Prangan Foundation workspace.";

describe("social sharing metadata", () => {
  it("publishes complete canonical, Open Graph, and Twitter metadata", async () => {
    const html = await readFile(
      new URL("../../../index.html", import.meta.url),
      "utf8",
    );

    for (const metadata of [
      `<link rel="canonical" href="${appUrl}" />`,
      '<meta name="robots" content="index, follow, max-image-preview:large" />',
      '<meta name="author" content="Prangan Foundation" />',
      `<meta name="description" content="${description}" />`,
      '<meta property="og:type" content="website" />',
      '<meta property="og:locale" content="en_IN" />',
      '<meta property="og:site_name" content="Prangan Manager" />',
      `<meta property="og:url" content="${appUrl}" />`,
      `<meta property="og:image" content="${imageUrl}" />`,
      `<meta property="og:image:secure_url" content="${imageUrl}" />`,
      '<meta property="og:image:type" content="image/png" />',
      '<meta property="og:image:width" content="1200" />',
      '<meta property="og:image:height" content="630" />',
      '<meta name="twitter:card" content="summary_large_image" />',
      `<meta name="twitter:image" content="${imageUrl}" />`,
    ]) {
      expect(html).toContain(metadata);
    }

    expect(html).toContain(
      '<meta property="og:title" content="Prangan Manager | Manage learning. Multiply impact." />',
    );
    expect(html).toContain(
      '<meta name="twitter:title" content="Prangan Manager | Manage learning. Multiply impact." />',
    );
    expect(html).toContain(
      '<meta property="og:image:alt" content="Prangan Manager by Prangan Foundation — manage learning and multiply impact." />',
    );
    expect(html).toContain(
      '<meta name="twitter:image:alt" content="Prangan Manager by Prangan Foundation — manage learning and multiply impact." />',
    );
  });

  it("describes the portal as a web application for search engines", async () => {
    const html = await readFile(
      new URL("../../../index.html", import.meta.url),
      "utf8",
    );
    const jsonLd = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );

    expect(jsonLd).not.toBeNull();
    expect(JSON.parse(jsonLd?.[1] ?? "{}")).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Prangan Manager",
      url: appUrl,
      image: imageUrl,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description,
      publisher: {
        "@type": "Organization",
        name: "Prangan Foundation",
        url: "https://pranganfoundation.org/",
      },
    });
  });

  it("ships an optimized 1200 by 630 PNG preview", async () => {
    const image = await readFile(
      new URL("../../../public/og-prangan-manager.png", import.meta.url),
    );

    expect(image.subarray(1, 4).toString()).toBe("PNG");
    expect(image.readUInt32BE(16)).toBe(1200);
    expect(image.readUInt32BE(20)).toBe(630);
    expect(image.byteLength).toBeLessThan(2_000_000);
  });
});
