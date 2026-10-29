import { useId } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      <label htmlFor={selectId} className="block text-sm font-semibold text-foreground">
        {label}
        {required ? (
          <span className="ml-1 font-normal text-muted-foreground">(required)</span>
        ) : null}
      </label>
      <Select
        name={name}
        required={required}
        // An empty value shows the placeholder; Radix reserves "" for that.
        value={value}
        onValueChange={onChange}
        disabled={disabled || isLoading || !!error || levels.length === 0}
      >
        <SelectTrigger id={selectId} aria-describedby={error ? `${selectId}-status` : undefined}>
          <SelectValue
            placeholder={
              isLoading
                ? "Loading levels..."
                : error
                  ? "Unable to load levels"
                  : levels.length === 0
                    ? "No active levels available"
                    : "Select a level"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {levels.map((level) => (
            <SelectItem key={level.id} value={level.id}>
              {levelName(level)}{level.isActive ? "" : " (inactive)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p id={`${selectId}-status`} role="alert" className="text-sm text-destructive">
          Unable to load levels. Try again.
        </p>
      ) : null}
    </div>
  );
}
