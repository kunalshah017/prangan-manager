import type { Book } from "@/data/books";
import { sortByJourneyOrder } from "@/lib/levels";
import type { SemesterLevel, User } from "@/types/api";

const libraryLevelName = (code?: string | null): string | null => {
  if (code?.startsWith("PRIMARY_")) {
    return `Primary ${code.slice("PRIMARY_".length).replaceAll("_", " ")}`;
  }
  if (code?.startsWith("LEVEL_")) {
    return `Level ${code.slice("LEVEL_".length).replaceAll("_", " ")}`;
  }
  return null;
};

export const filterBooksBySemesterLevels = (
  books: Book[],
  semesterLevels: SemesterLevel[],
): Book[] => {
  const enabledLevelNames = new Set(
    semesterLevels
      .filter((level) => level.isActive)
      .map(
        (level) =>
          libraryLevelName(level.academicLevel.code) ??
          level.academicLevel.name,
      ),
  );
  return books.filter((book) => enabledLevelNames.has(book.bookInfo.level));
};

export const getAvailableLibraryLevels = (
  books: Book[],
  semesterLevels?: SemesterLevel[],
): string[] => {
  const bookLevels = new Set(books.map((book) => book.bookInfo.level));
  const levels = semesterLevels
    ? sortByJourneyOrder(
        semesterLevels.filter((level) => level.isActive),
      )
        .map(
          (level) =>
            libraryLevelName(level.academicLevel.code) ??
            level.academicLevel.name,
        )
        .filter((level) => bookLevels.has(level))
    : [...bookLevels].sort((left, right) => left.localeCompare(right));

  return ["All", ...new Set(levels)];
};

export const getDefaultLibraryLevel = (user?: User | null): string => {
  const educatorAssignment = user?.roleAssignments?.find(
    (assignment) =>
      assignment.isActive && assignment.subRole === "EDUCATOR",
  );
  const code =
    educatorAssignment?.semesterLevel?.academicLevel?.code ||
    educatorAssignment?.level;

  const level = libraryLevelName(code);
  if (level) return level;

  return educatorAssignment?.semesterLevel?.academicLevel?.name || "All";
};
