import { useMemo } from "react";
import { Check, CalendarX2, Minus, Sun, X } from "lucide-react";

import { EmptyState } from "@/components/workspace/PageState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAttendanceRecords } from "@/hooks/useAttendanceQueries";
import { buildMonthlyActivity, type ActivityDay } from "@/lib/user-activity";
import { cn } from "@/lib/utils";
import type { User } from "@/types/api";
import { indiaToday } from "@/lib/dates";

const dayStyles: Record<ActivityDay["status"], { label: string; icon: typeof Check; className: string }> = {
  PRESENT: { label: "Present", icon: Check, className: "border-success/30 bg-success/10 text-success-foreground" },
  ABSENT: { label: "Absent", icon: X, className: "border-destructive/30 bg-destructive/5 text-destructive" },
  NOT_AVAILABLE: { label: "Not available", icon: Minus, className: "border-border bg-muted text-muted-foreground" },
  HOLIDAY: { label: "Holiday", icon: Sun, className: "border-border bg-muted text-muted-foreground" },
};

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  });

// Whole rupees read cleanly; paise appear only when a rate has them.
const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

// The last year of class days, up to today in India.
const lastYearStart = () => {
  const date = new Date(`${indiaToday()}T00:00:00.000Z`);
  date.setUTCFullYear(date.getUTCFullYear() - 1); // 29 Feb rolls to 1 Mar
  return date.toISOString().slice(0, 10);
};

interface MonthlyActivityProps {
  user: Pick<User, "id" | "name" | "firstName" | "remunerationPeriods">;
  isSelf: boolean;
}

// Month by month: which days someone worked and what that month pays. Days are
// shown as dates, not tallies, so a gap or a missed weekend is easy to spot.
export function MonthlyActivity({ user, isSelf }: MonthlyActivityProps) {
  const range = useMemo(() => ({ startDate: lastYearStart(), endDate: indiaToday() }), []);
  const attendanceQuery = useAttendanceRecords({ userId: user.id, ...range, limit: 1000 });
  const months = useMemo(
    () => buildMonthlyActivity(user, attendanceQuery.data?.attendances ?? []),
    [attendanceQuery.data, user],
  );

  if (attendanceQuery.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((item) => <Skeleton key={item} className="h-28 w-full rounded-xl" />)}
        <span className="sr-only">Loading attendance</span>
      </div>
    );
  }

  if (attendanceQuery.error) {
    return (
      <div className="rounded-xl border border-destructive/30 p-4" role="alert">
        <p className="text-base text-foreground">Attendance could not be loaded.</p>
        <button type="button" onClick={() => void attendanceQuery.refetch()} className="mt-3 min-h-11 rounded-md border border-input px-4 text-sm font-semibold hover:bg-accent">
          Try again
        </button>
      </div>
    );
  }

  if (months.length === 0) {
    return (
      <EmptyState
        icon={CalendarX2}
        title="No attendance in the last year"
        description={isSelf ? "Days you're marked present or absent will appear here, month by month." : "Marked days will appear here, month by month."}
      />
    );
  }

  return (
    <ol className="space-y-3" aria-label="Attendance and remuneration by month">
      {months.map((month) => (
        <li key={month.month} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">{month.label}</h3>
            {month.amount === null ? (
              <span className="text-sm text-muted-foreground">Rate not set</span>
            ) : month.amount !== undefined ? (
              <span className="text-base font-semibold tabular-nums text-foreground">{formatAmount(month.amount)}</span>
            ) : null}
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`Days in ${month.label}`}>
            {month.days.map((day) => {
              const style = dayStyles[day.status];
              const Icon = style.icon;
              return (
                <li
                  key={`${day.date}-${day.centreName}`}
                  title={`${style.label}${day.centreName ? `, ${day.centreName}` : ""}`}
                  className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm tabular-nums", style.className)}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {dayLabel(day.date)}
                  <span className="sr-only">: {style.label}</span>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}
