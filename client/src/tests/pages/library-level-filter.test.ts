import { describe, expect, it } from "vitest";

import { books } from "@/data/books";
import {
  filterBooksBySemesterLevels,
  getAvailableLibraryLevels,
  getDefaultLibraryLevel,
} from "@/lib/library";
import type { User } from "@/types/api";

const educator = (
  code: string,
): User =>
  ({
    roleAssignments: [
      {
        subRole: "EDUCATOR",
        isActive: true,
        semesterLevelId: `semester-${code}`,
        semesterLevel: {
          id: `semester-${code}`,
          semesterId: "semester-1",
          academicLevelId: `academic-${code}`,
          isActive: true,
          academicLevel: {
            id: `academic-${code}`,
            code,
            name: code.replaceAll("_", " "),
            journeyOrder: 1,
            isActive: true,
          },
            }
      },
    ],
  }) as User;

describe("getDefaultLibraryLevel", () => {
  it("maps managed Primary level codes to their library shelves", () => {
    expect(getDefaultLibraryLevel(educator("PRIMARY_A"))).toBe("Primary A");
    expect(getDefaultLibraryLevel(educator("PRIMARY_B"))).toBe("Primary B");
    expect(getDefaultLibraryLevel(educator("PRIMARY_C"))).toBe(
      "Primary C",
    );
  });

  it("preserves the existing numbered level shelves", () => {
    expect(getDefaultLibraryLevel(educator("LEVEL_2"))).toBe("Level 2");
  });

  it("shows only books for levels enabled in the selected semester", () => {
    const semesterLevels = [
      {
        id: "primary-b",
        semesterId: "semester-1",
        academicLevelId: "level-primary-b",
        isActive: true,
        academicLevel: {
          id: "level-primary-b",
          code: "PRIMARY_B",
          name: "Foundation B",
          journeyOrder: 200,
          isActive: true,
        },
      },
      {
        id: "level-2",
        semesterId: "semester-1",
        academicLevelId: "academic-level-2",
        isActive: true,
        academicLevel: {
          id: "academic-level-2",
          code: "LEVEL_2",
          name: "Level 2",
          journeyOrder: 500,
          isActive: true,
        },
      },
    ];
    const filtered = filterBooksBySemesterLevels(books, semesterLevels);

    expect([...new Set(filtered.map((book) => book.bookInfo.level))]).toEqual([
      "Primary B",
      "Level 2",
    ]);
    expect(filtered.every((book) => book.bookInfo.level !== "Primary A")).toBe(
      true,
    );
    expect(getAvailableLibraryLevels(filtered, semesterLevels)).toEqual([
      "All",
      "Primary B",
      "Level 2",
    ]);
  });
});
