import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("library PDF performance", () => {
  it("uses lightweight cover images without downloading PDFs on the catalog page", async () => {
    const library = await readFile(
      new URL("../../pages/library/Library.tsx", import.meta.url),
      "utf8",
    );
    const books = await readFile(
      new URL("../../data/books.ts", import.meta.url),
      "utf8",
    );

    expect(library).toContain("book.coverUrl");
    expect(library).toContain('loading="lazy"');
    expect(library).toContain("object-contain");
    expect(library).toContain("aspect-[323/438]");
    expect(library).not.toContain("react-pdf");
    expect(library).not.toContain("fetchPDFWithCache");
    expect(library).not.toContain("IntersectionObserver");
    expect(library).toContain("clearLegacyPdfCache");
    expect(
      books.match(/coverUrl: "\/images\/library\/.+\.webp"/g),
    ).toHaveLength(8);
  });

  it("streams directly with stable scroll geometry and bounded page rendering", async () => {
    const reader = await readFile(
      new URL("../../pages/library/BookReader.tsx", import.meta.url),
      "utf8",
    );

    expect(reader).toContain("const PAGE_WINDOW_RADIUS = 2");
    expect(reader).toContain("const allPageNumbers = useMemo");
    expect(reader).toContain("const visiblePageNumbers = useMemo");
    expect(reader).toContain("allPageNumbers.map");
    expect(reader).toContain("visiblePageNumbers.has(bookPageNum)");
    expect(reader).toContain("aspect-[581/782]");
    expect(reader).toContain("delete pageRefs.current[bookPageNum]");
    expect(reader).toContain("requestAnimationFrame");
    expect(reader).toContain(
      "rect.top <= readingLine && rect.bottom > readingLine",
    );
    expect(reader).toContain("const PDF_OPTIONS = {");
    expect(reader).toContain("options={PDF_OPTIONS}");
    expect(reader).toContain(
      'className="flex w-full flex-col items-center gap-6"',
    );
    expect(reader).toContain('aria-label="Previous page"');
    expect(reader).toContain('aria-label="Next page"');
    expect(reader).toContain('aria-label="Open table of contents"');
    expect(reader).toContain("file={book.pdfUrl}");
    expect(reader).toContain("pdfjs-dist/build/pdf.worker.min.mjs");
    expect(reader).not.toContain(
      "GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist",
    );
    expect(reader).not.toContain("fetchPDFWithCache");
    expect(reader).not.toContain("URL.createObjectURL");
  });

  it("pins the PDF.js worker to the version used by react-pdf", async () => {
    const packageJson = JSON.parse(
      await readFile(new URL("../../../package.json", import.meta.url), "utf8"),
    );

    expect(packageJson.dependencies["pdfjs-dist"]).toBe("5.4.296");
    expect(packageJson.dependencies["react-pdf"]).toBe("^10.2.0");
  });

  it("removes the obsolete IndexedDB full-book cache", async () => {
    const storage = await readFile(
      new URL("../../lib/pdf-storage.ts", import.meta.url),
      "utf8",
    );

    expect(storage).toContain(
      'indexedDB.deleteDatabase("prangan-pdf-storage")',
    );
    expect(storage).not.toContain("response.blob()");
    expect(storage).not.toContain("storePDF");
  });
});
