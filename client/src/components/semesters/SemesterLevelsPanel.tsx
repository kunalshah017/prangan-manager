import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { CustomButton } from "@/components/ui/button";
import {
  useAcademicLevels,
  useReplaceSemesterLevels,
} from "@/hooks/useAcademicLevelQueries";
import { levelName, sortByJourneyOrder } from "@/lib/levels";
import { queryKeys } from "@/lib/query-client";
import type { SemesterLevel, Syllabus } from "@/types/api";

interface SemesterLevelsPanelProps {
  projectId: string;
  centerId: string;
  semesterId: string;
  levels: SemesterLevel[];
  studentsByLevel?: Record<string, number>;
  syllabi?: Syllabus[];
  canManage: boolean;
}

export function SemesterLevelsPanel({
  projectId,
  centerId,
  semesterId,
  levels,
  studentsByLevel,
  syllabi,
  canManage,
}: SemesterLevelsPanelProps) {
  const queryClient = useQueryClient();
  const [isManaging, setIsManaging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const catalogueQuery = useAcademicLevels({ enabled: isManaging });
  const replaceMutation = useReplaceSemesterLevels();

  const syllabusByLevel = useMemo(
    () => new Map((syllabi ?? []).map((syllabus) => [syllabus.semesterLevelId, syllabus])),
    [syllabi],
  );
  const studentsByAcademicLevel = useMemo(
    () =>
      new Map(
        levels.map((level) => [level.academicLevelId, studentsByLevel?.[level.id] ?? 0]),
      ),
    [levels, studentsByLevel],
  );
  const catalogue = useMemo(() => {
    const enabled = levels.map((level) => level.academicLevel);
    const available = (catalogueQuery.data ?? []).filter(
      (level) => !enabled.some((current) => current.id === level.id),
    );
    return sortByJourneyOrder([...enabled, ...available]);
  }, [catalogueQuery.data, levels]);
  const syllabusBase = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus`;

  const startManaging = () => {
    setSelectedIds(levels.map((level) => level.academicLevelId));
    setIsManaging(true);
  };

  const toggle = (academicLevelId: string) =>
    setSelectedIds((current) =>
      current.includes(academicLevelId)
        ? current.filter((id) => id !== academicLevelId)
        : [...current, academicLevelId],
    );

  const save = async () => {
    try {
      await replaceMutation.mutateAsync({
        semesterId,
        data: { academicLevelIds: selectedIds },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.semester(semesterId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.syllabi }),
      ]);
      toast.success("Semester levels updated.");
      setIsManaging(false);
    } catch {
      toast.error("Unable to update semester levels. Try again.");
    }
  };

  return (
    <section aria-labelledby="levels-title" className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="levels-title" className="text-base font-semibold text-foreground">Levels</h2>
        {canManage && !isManaging && (
          <button
            type="button"
            onClick={startManaging}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            Manage
          </button>
        )}
      </div>

      {!isManaging ? (
        levels.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No levels are running this semester.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {levels.map((level) => {
              const syllabus = syllabusByLevel.get(level.id);
              const stats = syllabus?.stats;
              const progress = stats?.totalTopics
                ? Math.round((stats.completedTopics / stats.totalTopics) * 100)
                : 0;
              return (
                <li key={level.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">{levelName(level)}</span>
                    {studentsByLevel && (
                      <span className="tabular-nums text-muted-foreground">
                        {studentsByLevel[level.id] ?? 0} student{studentsByLevel[level.id] === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  {syllabi && (
                    syllabus ? (
                      <Link
                        to={`${syllabusBase}/${syllabus.id}/progress`}
                        className="mt-2 block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`${levelName(level)} syllabus: ${progress}% complete`}
                      >
                        <span className="mb-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            Syllabus
                          </span>
                          <span className="tabular-nums">
                            {stats?.completedTopics ?? 0}/{stats?.totalTopics ?? 0} topics
                          </span>
                        </span>
                        <span className="block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                        </span>
                      </Link>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">No syllabus yet</p>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <div className="mt-3">
          <p className="text-sm leading-6 text-muted-foreground">
            Choose the levels this centre runs this semester. Levels come from the{" "}
            <Link to="/academic-levels" className="font-medium text-primary hover:underline">level catalogue</Link>.
          </p>
          {catalogueQuery.isLoading ? (
            <div className="mt-3 h-32 animate-pulse rounded-md bg-muted motion-reduce:animate-none" aria-label="Loading level catalogue" />
          ) : catalogueQuery.error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">The level catalogue could not be loaded.</p>
          ) : (
            <fieldset className="mt-3 space-y-2" aria-describedby="semester-levels-help">
              <legend className="sr-only">Levels running this semester</legend>
              {catalogue.map((level) => {
                const studentCount = studentsByAcademicLevel.get(level.id) ?? 0;
                const isChecked = selectedIds.includes(level.id);
                const isLocked = isChecked && studentCount > 0;
                return (
                  <label
                    key={level.id}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:disabled]:cursor-not-allowed"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isLocked || replaceMutation.isPending}
                      onChange={() => toggle(level.id)}
                      className="h-5 w-5 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 flex-1 font-medium text-foreground">{level.name}</span>
                    {isLocked && (
                      <span className="text-xs text-muted-foreground">
                        {studentCount} student{studentCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </label>
                );
              })}
            </fieldset>
          )}
          <p id="semester-levels-help" className="mt-2 text-xs leading-5 text-muted-foreground">
            A level with enrolled students can't be turned off. Move its students to another level first.
          </p>
          {selectedIds.length === 0 && (
            <p className="mt-2 text-sm text-destructive" role="alert">Select at least one level.</p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <CustomButton
              type="button"
              variant="outline"
              onClick={() => setIsManaging(false)}
              disabled={replaceMutation.isPending}
              className="min-h-11"
            >
              Cancel
            </CustomButton>
            <CustomButton
              type="button"
              onClick={() => void save()}
              disabled={selectedIds.length === 0 || replaceMutation.isPending || !!catalogueQuery.error}
              className="min-h-11"
            >
              {replaceMutation.isPending ? "Saving..." : "Save levels"}
            </CustomButton>
          </div>
        </div>
      )}
    </section>
  );
}
