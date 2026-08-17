import type { AcademicLevel, SemesterLevel } from "@/types/api";

type ManagedLevel = AcademicLevel | SemesterLevel;

const academicLevel = (level: ManagedLevel): AcademicLevel =>
  "academicLevel" in level ? level.academicLevel : level;

export const levelName = (
  level?: ManagedLevel | null,
): string => (level ? academicLevel(level).name : "");

export const levelCode = (
  level?: ManagedLevel | null,
): string => (level ? academicLevel(level).code : "");

export const sortByJourneyOrder = <T extends ManagedLevel>(levels: T[]): T[] =>
  [...levels].sort(
    (left, right) =>
      academicLevel(left).journeyOrder - academicLevel(right).journeyOrder,
  );

const nameCollator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});

export const sortByJourneyOrderThenName = <T>(
  records: readonly T[],
  getLevel: (record: T) => AcademicLevel | null | undefined,
  getName: (record: T) => string,
): T[] =>
  [...records].sort((left, right) => {
    const levelOrder =
      (getLevel(left)?.journeyOrder ?? Number.POSITIVE_INFINITY) -
      (getLevel(right)?.journeyOrder ?? Number.POSITIVE_INFINITY);
    return levelOrder || nameCollator.compare(getName(left), getName(right));
  });
