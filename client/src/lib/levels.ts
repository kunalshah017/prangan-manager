import type { AcademicLevel, LegacyLevel, SemesterLevel } from "@/types/api";

type ManagedLevel = AcademicLevel | SemesterLevel;

const academicLevel = (level: ManagedLevel): AcademicLevel =>
  "academicLevel" in level ? level.academicLevel : level;

const legacyName = (level: LegacyLevel): string =>
  level
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");

export const levelName = (
  level?: ManagedLevel | null,
  legacyLevel?: LegacyLevel | null,
): string =>
  level
    ? academicLevel(level).name
    : legacyLevel
      ? legacyName(legacyLevel)
      : "";

export const levelCode = (
  level?: ManagedLevel | null,
  legacyLevel?: LegacyLevel | null,
): string => (level ? academicLevel(level).code : (legacyLevel ?? ""));

export const sortByJourneyOrder = <T extends ManagedLevel>(levels: T[]): T[] =>
  [...levels].sort(
    (left, right) =>
      academicLevel(left).journeyOrder - academicLevel(right).journeyOrder,
  );
