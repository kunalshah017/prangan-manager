import { useId } from "react";

import { useSemesterLevels } from "@/hooks/useAcademicLevelQueries";
import { levelName, sortByJourneyOrder } from "@/lib/levels";
import type { SemesterLevel } from "@/types/api";

export interface SemesterLevelSelectProps {
  semesterId: string;
  value?: string;
  onChange: (semesterLevelId: string) => void;
  label?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  includeInactiveCurrent?: boolean;
  currentLevel?: SemesterLevel;
}

const fieldClass =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";

export function SemesterLevelSelect({
  semesterId,
  value = "",
  onChange,
  label = "Level",
  id,
  name,
  disabled = false,
  required = false,
  includeInactiveCurrent = false,
  currentLevel,
}: SemesterLevelSelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const activeQuery = useSemesterLevels(semesterId);
  const currentIsMissing =
    !!value &&
    activeQuery.isSuccess &&
    !activeQuery.data.some((level) => level.id === value);
  const inactiveQuery = useSemesterLevels(semesterId, { includeInactive: true,
    enabled: includeInactiveCurrent && currentIsMissing,
  });
  const inactiveCurrent = inactiveQuery.data?.find(
    (level) => level.id === value && !level.isActive,
  );
  const fallbackCurrent =
    includeInactiveCurrent &&
    currentLevel?.id === value &&
    !currentLevel.isActive
      ? currentLevel
      : undefined;
  const selectedInactiveLevel = inactiveCurrent ?? fallbackCurrent;
  const levels = sortByJourneyOrder([
    ...(activeQuery.data ?? []),
    ...(selectedInactiveLevel ? [selectedInactiveLevel] : []),
  ]);
  const isLoading =
    activeQuery.isLoading ||
    (includeInactiveCurrent && currentIsMissing && inactiveQuery.isLoading);
  const error = activeQuery.error ?? inactiveQuery.error;

  return (
    <div className="space-y-2">
      <label htmlFor={selectId} className="block text-sm font-medium text-foreground">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || isLoading || !!error || levels.length === 0}
        required={required}
        aria-describedby={error ? `${selectId}-status` : undefined}
        className={fieldClass}
      >
        <option value="">
          {isLoading
            ? "Loading levels..."
            : error
              ? "Unable to load levels"
              : levels.length === 0
                ? "No active levels available"
                : "Select a level"}
        </option>
        {levels.map((level) => (
          <option key={level.id} value={level.id}>
            {levelName(level)}{level.isActive ? "" : " (inactive)"}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${selectId}-status`} role="alert" className="text-sm text-destructive">
          Unable to load levels. Try again.
        </p>
      ) : null}
    </div>
  );
}