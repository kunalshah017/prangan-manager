import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { books as bookCatalog } from "@/data/books";

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
    expect(library).toContain("useSemesterLevels");
    expect(library).toContain("filterBooksBySemesterLevels");
    expect(library).toContain("searchParams.get(\"semesterId\")");
    expect(
      books.match(/coverUrl:\s*"\/images\/library\/.+\.webp"/g),
    ).toHaveLength(14);
    expect(
      bookCatalog.slice(0, 6).map((book) => book.bookInfo.title),
    ).toEqual([
      "Learn with Cambridge: Primary A — Semester 1",
      "Learn with Cambridge: Primary A — Semester 2",
      "Learn with Cambridge: Primary B — Semester 1",
      "Learn with Cambridge: Primary B — Semester 2",
      "Learn with Cambridge: Primary C — Semester 1",
      "Learn with Cambridge: Primary C — Semester 2",
    ]);
    expect(bookCatalog[0].pdfUrl).toContain(
      "learn_with_cambridge_primary_a_semester_1-8dGKA0IabpfdPcieQSR8b6KJNGy2pD.pdf",
    );
    expect(bookCatalog[3].pdfUrl).toContain(
      "learn_with_cambridge_primary_b_semester_2-iYCjgKDV4AsihizZDnZCFRp1lWXZmv.pdf",
    );
    expect(bookCatalog[4].pdfUrl).toContain(
      "learn_with_cambridge_primary_c_semester_1-9oU5I0iBP1r3cmkkuMjBGDtGFmhPoq.pdf",
    );
    expect(bookCatalog[5].pdfUrl).toContain(
      "learn_with_cambridge_primary_c_semester_2-ryYDSNm1CoMgBg1jHb7Js4vnwzTEwT.pdf",
    );
  });

  it("shows the reviewed table of contents for every Primary book", () => {
    expect(
      bookCatalog
        .slice(0, 6)
        .map((book) =>
          book.structure.reduce(
            (count, section) => count + (section.children?.length ?? 0),
            0,
          ),
        ),
    ).toEqual([78, 76, 79, 74, 83, 80]);
    expect(bookCatalog.slice(0, 6).map((book) => book.pdfOffset)).toEqual([
      9, 9, 9, 9, 9, 9,
    ]);
    expect(
      bookCatalog[0].structure.map((section) => section.title),
    ).toEqual([
      "Literacy",
      "Numeracy",
      "Rhymes and Stories",
      "General Awareness",
    ]);

    expect(bookCatalog[0].structure[0].children?.[0]).toMatchObject({
      title: "Scribble!",
      pageStart: 2,
      theme: "SA-1",
    });
    expect(bookCatalog[3].structure.at(-1)?.children?.at(-1)).toMatchObject({
      title: "Water",
      pageStart: 117,
      theme: "SA-3",
    });
    expect(bookCatalog[5].structure.at(-1)?.children?.at(-1)).toMatchObject({
      title: "More Helpers",
      pageStart: 119,
      theme: "SA-3",
    });
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
    expect(reader).toContain("readLastReadPage");
    expect(reader).toContain("writeLastReadPage");
    expect(reader).toContain("pendingInitialPageRef");
    expect(reader).toContain("flattenBookStructure");
    expect(reader).toContain("item.children?.map");
    expect(reader).toContain(
      "rect.top <= readingLine && rect.bottom > readingLine",
    );
    expect(reader).toContain("const PDF_OPTIONS = {");
    expect(reader).toContain("options={PDF_OPTIONS}");
    expect(reader).toContain(
      'className="flex w-full flex-col items-center gap-6"',
    );
    expect(reader).toContain('aria-label="Back to Library"');
    expect(reader).toContain('aria-label="Book breadcrumb"');
    expect(reader).toContain("<Link");
    expect(reader).toContain("Library");
    expect(reader).toContain('aria-label="Previous page"');
    expect(reader).toContain('aria-label="Next page"');
    expect(reader).toContain('aria-label="Open table of contents"');
    expect(reader).toContain("file={book.pdfUrl}");
    expect(reader).toContain("navigate(`/library${location.search}`");
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
