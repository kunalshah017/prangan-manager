import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  IndianRupee,
  Search,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

import LoadingButterfly from "@/components/LoadingButterfly";
import {
  WorkspacePage,
  WorkspacePageHeader,
} from "@/components/workspace/WorkspacePage";
import { useAttendanceRecords } from "@/hooks/useAttendanceQueries";
import { useSemester } from "@/hooks/useSemesterQueries";
import {
  useRemunerationUsers,
  useSetRemunerationPeriod,
} from "@/hooks/useUserQueries";
import {
  buildMonthlyRemunerationSummary,
  buildRemunerationRows,
  clampRangeToSemester,
  enumerateSemesterMonths,
  formatINR,
  getMonthRange,
  previewRemunerationSchedule,
  selectDefaultSemesterMonth,
  validateRemunerationRate,
} from "@/lib/remuneration";
import type { MonthlyRemunerationSummary } from "@/lib/remuneration";
import type { RemunerationUser } from "@/types/api";

type SemesterRemunerationSummary = {
  months: MonthlyRemunerationSummary[];
  presentDays: number;
  missingRateUserIds: string[];
  calculatedAmount: number | null;
  isComplete: boolean;
};

const formatDateOnly = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

const safeDomId = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, "-");

export const RemunerationRateField = ({
  userId,
  userName,
  value,
  error,
  onChange,
  idSuffix = "",
}: {
  userId: string;
  userName: string;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  idSuffix?: string;
}) => {
  const fieldId = `remuneration-rate-${safeDomId(userId)}${idSuffix ? `-${idSuffix}` : ""}`;
  const errorId = `${fieldId}-error`;
  return (
    <div>
      <div className="relative">
        <IndianRupee className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        <input
          id={fieldId}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Set amount"
          aria-label={`Daily remuneration for ${userName}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`min-h-11 w-full rounded-xl border bg-background pl-9 pr-2 text-base outline-none focus:ring-2 focus:ring-primary/20 md:text-sm ${
            error ? "border-destructive focus:border-destructive" : "border-input focus:border-primary"
          }`}
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export const UnsavedRatesNotice = ({
  isFullSemester,
  hasInvalidRate,
  isPending,
  saveError,
  onSave,
}: {
  isFullSemester: boolean;
  hasInvalidRate: boolean;
  isPending: boolean;
  saveError: string;
  onSave: () => void;
}) => (
  <div
    className={`mt-4 flex flex-col gap-3 rounded-xl border p-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
      saveError
        ? "border-destructive/30 bg-destructive/5 text-destructive"
        : "border-amber-300 bg-amber-50 text-amber-950"
    }`}
    role={saveError ? "alert" : "status"}
  >
    <div>
      <p className="font-semibold">
        {saveError ? "Remuneration was not saved" : "Unsaved remuneration changes"}
      </p>
      <p className="mt-0.5">
        {saveError
          ? "Check your connection and try saving again."
          : isFullSemester
            ? "Full-semester totals use the saved schedule until you save these changes."
            : "Monthly amounts are a preview until you save this remuneration."}
      </p>
      {hasInvalidRate && (
        <p className="mt-1 font-medium">
          Open a month and correct the highlighted remuneration before saving.
        </p>
      )}
    </div>
    <button
      type="button"
      onClick={onSave}
      disabled={hasInvalidRate || isPending}
      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Banknote className="h-4 w-4" />
      {isPending ? "Saving…" : saveError ? "Try saving again" : "Save remuneration"}
    </button>
  </div>
);

export const MonthlySemesterOverview = ({
  summary,
  onSelectMonth,
}: {
  summary: SemesterRemunerationSummary;
  onSelectMonth: (month: string) => void;
}) => (
  <section className="mt-6" aria-labelledby="semester-remuneration-heading">
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Semester total
          </p>
          <h2
            id="semester-remuneration-heading"
            className="mt-1 text-2xl font-semibold tabular-nums text-foreground"
          >
            {summary.calculatedAmount === null
              ? "Pending remuneration"
              : formatINR(summary.calculatedAmount)}
          </h2>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="font-semibold tabular-nums text-foreground">
              {summary.presentDays}
            </p>
            <p className="text-muted-foreground">Present days</p>
          </div>
          <div>
            <p className="font-semibold tabular-nums text-foreground">
              {summary.missingRateUserIds.length}
            </p>
            <p className="text-muted-foreground">Missing remuneration</p>
          </div>
        </div>
      </div>
    </div>

    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {summary.months.map((month) => (
        <button
          key={month.month}
          type="button"
          onClick={() => onSelectMonth(month.month)}
          aria-label={`View ${month.label} remuneration`}
          className="group min-h-11 w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">{month.label}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDateOnly(month.startDate)} – {formatDateOnly(month.endDate)}
              </p>
            </div>
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-semibold tabular-nums text-foreground">
                {month.calculatedAmount === null
                  ? "Pending remuneration"
                  : formatINR(month.calculatedAmount)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {month.presentDays} present{" "}
                {month.presentDays === 1 ? "day" : "days"}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                month.status === "NO_PAYABLE_ATTENDANCE"
                  ? "bg-muted text-muted-foreground"
                  : month.isComplete
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {month.status === "NO_PAYABLE_ATTENDANCE"
                ? "No payable attendance"
                : month.isComplete
                ? "Remuneration ready"
                : `${month.missingRateUserIds.length} ${
                    month.missingRateUserIds.length === 1 ? "amount" : "amounts"
                  } missing`}
            </span>
          </div>
        </button>
      ))}
    </div>
  </section>
);

const CopyValue = ({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {value && (
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary/10"
            aria-label={`Copy ${label}`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <p className="mt-1 break-all text-sm font-medium text-foreground">
        {value || "Not provided"}
      </p>
    </div>
  );
};

const PaymentDetails = ({ payee }: { payee?: RemunerationUser }) => (
  <div className="grid gap-3 rounded-2xl border border-border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
    <CopyValue label="Account holder" value={payee?.bankAccountName} />
    <CopyValue label="Account number" value={payee?.bankAccountNumber} />
    <CopyValue label="IFSC" value={payee?.bankIfsc} />
    <CopyValue label="Bank" value={payee?.bankName} />
    <CopyValue label="Branch" value={payee?.bankBranch} />
    <CopyValue label="UPI ID" value={payee?.upiId} />
  </div>
);

export const Remuneration = () => {
  const { projectId = "", centerId = "", semesterId = "" } = useParams();
  const semesterQuery = useSemester(semesterId);
  const [period, setPeriod] = useState("");
  const [search, setSearch] = useState("");
  const [readiness, setReadiness] = useState<"ALL" | "READY" | "NEEDS_RATE">("ALL");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});
  const [effectiveDateDrafts, setEffectiveDateDrafts] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");
  const initializedSemester = useRef("");

  const months = useMemo(() => {
    const semester = semesterQuery.data;
    return semester?.startDate && semester.endDate
      ? enumerateSemesterMonths(semester.startDate, semester.endDate)
      : [];
  }, [semesterQuery.data]);

  useEffect(() => {
    const semester = semesterQuery.data;
    if (!semester?.startDate || !semester.endDate) return;
    const semesterKey = `${semesterId}\0${semester.startDate}\0${semester.endDate}`;
    if (initializedSemester.current === semesterKey) return;
    initializedSemester.current = semesterKey;
    setSearch("");
    setReadiness("ALL");
    setExpanded({});
    setSaveError("");
    setPeriod(
      selectDefaultSemesterMonth(semester.startDate, semester.endDate),
    );
  }, [semesterId, semesterQuery.data]);

  const range = useMemo(() => {
    const semester = semesterQuery.data;
    if (!semester?.startDate || !semester.endDate) {
      return { startDate: "", endDate: "" };
    }
    if (!period) {
      return { startDate: "", endDate: "" };
    }
    if (period === "FULL") {
      return {
        startDate: semester.startDate.slice(0, 10),
        endDate: semester.endDate.slice(0, 10),
      };
    }
    return clampRangeToSemester(getMonthRange(period), semester);
  }, [period, semesterQuery.data]);

  const attendanceQuery = useAttendanceRecords({
    startDate: range.startDate,
    endDate: range.endDate,
    projectId,
    centerId,
    semesterId,
    page: 1,
    limit: period === "FULL" ? 10000 : 1000,
    enabled: Boolean(range.startDate && range.endDate),
  });
  const payeesQuery = useRemunerationUsers({ projectId, centerId, semesterId });
  const updateRates = useSetRemunerationPeriod({
    projectId,
    centerId,
    semesterId,
  });

  useEffect(() => {
    if (!payeesQuery.data || !semesterQuery.data) return;
    const start = semesterQuery.data.startDate.slice(0, 10);
    const end = semesterQuery.data.endDate.slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const defaultDate = today < start ? start : today > end ? end : today;
    setRateDrafts(
      Object.fromEntries(
        payeesQuery.data.map((payee) => [
          payee.id,
          payee.dailyRate === null ? "" : String(payee.dailyRate),
        ]),
      ),
    );
    setEffectiveDateDrafts(
      Object.fromEntries(payeesQuery.data.map((payee) => [payee.id, defaultDate])),
    );
  }, [payeesQuery.data, semesterQuery.data]);

  const previewPayees = useMemo(
    () =>
      (payeesQuery.data ?? []).map((payee) => {
        const raw = rateDrafts[payee.id];
        if (raw === undefined) return payee;
        if (validateRemunerationRate(raw, payee.dailyRate)) {
          return { ...payee, dailyRate: null };
        }
        const dailyRate = Number(raw);
        const effectiveFrom = effectiveDateDrafts[payee.id];
        if (dailyRate === payee.dailyRate) return payee;
        const basePeriods =
          payee.remunerationPeriods ??
          (payee.dailyRate !== null && semesterQuery.data
            ? [
                {
                  id: `legacy-${payee.id}`,
                  amountPerDay: payee.dailyRate,
                  effectiveFrom: semesterQuery.data.startDate.slice(0, 10),
                  effectiveTo: null,
                },
              ]
            : []);
        return {
          ...payee,
          dailyRate:
            raw.trim() !== "" && Number.isFinite(dailyRate) && dailyRate >= 0
              ? dailyRate
              : null,
          remunerationPeriods:
            raw.trim() !== "" &&
            Number.isFinite(dailyRate) &&
            dailyRate >= 0 &&
            effectiveFrom
              ? previewRemunerationSchedule(
                  basePeriods,
                  dailyRate,
                  effectiveFrom,
                )
              : payee.remunerationPeriods,
        };
      }),
    [effectiveDateDrafts, payeesQuery.data, rateDrafts, semesterQuery.data],
  );
  const persistedResult = useMemo(
    () =>
      buildRemunerationRows(
        attendanceQuery.data?.attendances ?? [],
        payeesQuery.data ?? [],
      ),
    [attendanceQuery.data, payeesQuery.data],
  );
  const previewResult = useMemo(
    () =>
      buildRemunerationRows(
        attendanceQuery.data?.attendances ?? [],
        previewPayees,
      ),
    [attendanceQuery.data, previewPayees],
  );
  const result = period === "FULL" ? persistedResult : previewResult;
  const semesterSummary = useMemo(() => {
    const semester = semesterQuery.data;
    if (!semester?.startDate || !semester.endDate) return null;
    return buildMonthlyRemunerationSummary(
      result.monthlyRows,
      semester.startDate,
      semester.endDate,
    );
  }, [result.monthlyRows, semesterQuery.data]);
  const payeeById = useMemo(
    () => new Map((payeesQuery.data ?? []).map((payee) => [payee.id, payee])),
    [payeesQuery.data],
  );
  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return result.rows.filter((row) => {
      if (query && !row.userName.toLocaleLowerCase().includes(query)) return false;
      if (readiness === "READY" && row.dailyRate === null) return false;
      if (readiness === "NEEDS_RATE" && row.dailyRate !== null) return false;
      return true;
    });
  }, [readiness, result.rows, search]);

  const changedRates = useMemo(
    () =>
      (payeesQuery.data ?? []).flatMap((payee) => {
        const raw = rateDrafts[payee.id]?.trim() ?? "";
        if (!raw || validateRemunerationRate(raw, payee.dailyRate)) return [];
        const dailyRate = Number(raw);
        if (dailyRate === payee.dailyRate) return [];
        return [{ userId: payee.id, dailyRate }];
      }),
    [payeesQuery.data, rateDrafts],
  );
  const rateErrors = useMemo(
    () =>
      Object.fromEntries(
        (payeesQuery.data ?? []).map((payee) => [
          payee.id,
          validateRemunerationRate(
            rateDrafts[payee.id] ?? "",
            payee.dailyRate,
          ),
        ]),
      ) as Record<string, string | null>,
    [payeesQuery.data, rateDrafts],
  );
  const dateErrors = useMemo(() => {
    const semester = semesterQuery.data;
    if (!semester) return {} as Record<string, string>;
    const start = semester.startDate.slice(0, 10);
    const end = semester.endDate.slice(0, 10);
    return Object.fromEntries(
      (payeesQuery.data ?? []).map((payee) => {
        const value = effectiveDateDrafts[payee.id] ?? "";
        return [
          payee.id,
          !value || value < start || value > end
            ? `Choose a date from ${start} to ${end}.`
            : "",
        ];
      }),
    ) as Record<string, string>;
  }, [effectiveDateDrafts, payeesQuery.data, semesterQuery.data]);
  const hasInvalidRate =
    Object.values(rateErrors).some(Boolean) ||
    Object.values(dateErrors).some(Boolean);
  const hasUnsavedDrafts = (payeesQuery.data ?? []).some((payee) => {
    const raw = rateDrafts[payee.id];
    if (raw === undefined) return false;
    if (validateRemunerationRate(raw, payee.dailyRate)) return true;
    return raw.trim() !== "" && Number(raw) !== payee.dailyRate;
  });

  const saveRates = async () => {
    setSaveError("");
    try {
      await Promise.all(
        changedRates.map(({ userId, dailyRate }) =>
          updateRates.mutateAsync({
            userId,
            amountPerDay: dailyRate,
            effectiveFrom: effectiveDateDrafts[userId],
          }),
        ),
      );
      toast.success("Remuneration schedule saved.");
    } catch {
      setSaveError("Unable to save remuneration.");
      toast.error("Unable to save remuneration. Try again.");
    }
  };

  const selectPeriod = (nextPeriod: string) => {
    setExpanded({});
    setPeriod(nextPeriod);
  };
  const updateRateDraft = (userId: string, value: string) => {
    setSaveError("");
    setRateDrafts((current) => ({ ...current, [userId]: value }));
  };

  const isLoading =
    semesterQuery.isLoading ||
    attendanceQuery.isLoading ||
    payeesQuery.isLoading;
  const error =
    semesterQuery.error || attendanceQuery.error || payeesQuery.error;
  const totalPresent = result.rows.reduce((sum, row) => sum + row.present, 0);
  const readyCount = result.rows.filter((row) => row.dailyRate !== null).length;

  if (isLoading) return <LoadingButterfly />;
  if (error) {
    return (
      <WorkspacePage>
        <WorkspacePageHeader
          title="Remuneration"
          badge={semesterQuery.data?.name}
          description="Review attendance-based payments and manage effective-dated remuneration for this semester."
        />
        <div
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>We could not load the remuneration ledger. Please try again.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void semesterQuery.refetch();
              void attendanceQuery.refetch();
              void payeesQuery.refetch();
            }}
            className="min-h-11 rounded-xl border border-destructive/30 bg-background px-4 font-semibold text-destructive hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          >
            Retry
          </button>
        </div>
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        title="Remuneration"
        badge={semesterQuery.data?.name}
        description="Review attendance-based payments and manage effective-dated remuneration for this semester."
      />

      {hasUnsavedDrafts && (
        <UnsavedRatesNotice
          isFullSemester={period === "FULL"}
          hasInvalidRate={hasInvalidRate}
          isPending={updateRates.isPending}
          saveError={saveError}
          onSave={() => void saveRates()}
        />
      )}

      <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 sm:max-w-xs">
            <span className="mb-1.5 block text-sm font-semibold text-foreground">
              Remuneration month
            </span>
            <select
              value={period === "FULL" ? "" : period}
              onChange={(event) => selectPeriod(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
            >
              {period === "FULL" && (
                <option value="" disabled>
                  Select a month
                </option>
              )}
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => selectPeriod("FULL")}
            aria-pressed={period === "FULL"}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              period === "FULL"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Full semester
          </button>
        </div>
      </section>

      {period !== "FULL" && (
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expected payment</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {result.total === null ? "Pending remuneration" : formatINR(result.total)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {result.missingRateUserIds.length
                ? `${result.missingRateUserIds.length} ${result.missingRateUserIds.length === 1 ? "person needs" : "people need"} remuneration`
                : "All recorded attendance is priced"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Present days</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{totalPresent}</p>
            <p className="mt-1 text-xs text-muted-foreground">Across the selected period</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Remuneration ready</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {readyCount} / {result.rows.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Attendance payees configured</p>
          </div>
        </section>
      )}

      {period !== "FULL" && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <label className="relative">
              <span className="sr-only">Search people</span>
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search people"
                className="min-h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
              />
            </label>
            <label>
              <span className="sr-only">Payment readiness</span>
              <select
                value={readiness}
                onChange={(event) => setReadiness(event.target.value as typeof readiness)}
                className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-base sm:text-sm"
              >
                <option value="ALL">All remuneration states</option>
                <option value="READY">Remuneration ready</option>
                <option value="NEEDS_RATE">Needs remuneration</option>
              </select>
            </label>
          </div>
        </section>
      )}

      {period === "FULL" && semesterSummary ? (
        <MonthlySemesterOverview
          summary={semesterSummary}
          onSelectMonth={selectPeriod}
        />
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-semibold text-foreground">No matching attendance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Adjust the filters or record staff attendance for this period.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3 md:hidden">
            {rows.map((row) => {
              const payee = payeeById.get(row.userId);
              const isExpanded = expanded[row.userId];
              const detailsId = `mobile-payment-details-${safeDomId(row.userId)}`;
              return (
                <article key={row.userId} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-foreground">{row.userName}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.present} present · {row.absent} absent · {row.notAvailable} unavailable
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${row.dailyRate === null ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {row.dailyRate === null ? "Needs remuneration" : "Ready"}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 min-[380px]:grid-cols-2">
                      <label className="min-w-0">
                        <span className="text-xs font-medium text-muted-foreground">Daily remuneration</span>
                        <div className="mt-1">
                          <RemunerationRateField
                            userId={row.userId}
                            userName={row.userName}
                            value={rateDrafts[row.userId] ?? ""}
                            error={rateErrors[row.userId] ?? null}
                            onChange={(value) => updateRateDraft(row.userId, value)}
                            idSuffix="mobile"
                          />
                        </div>
                      </label>
                      <label className="min-w-0">
                        <span className="text-xs font-medium text-muted-foreground">Effective from</span>
                        <input
                          type="date"
                          value={effectiveDateDrafts[row.userId] ?? ""}
                          min={semesterQuery.data?.startDate.slice(0, 10)}
                          max={semesterQuery.data?.endDate.slice(0, 10)}
                          onChange={(event) =>
                            setEffectiveDateDrafts((current) => ({
                              ...current,
                              [row.userId]: event.target.value,
                            }))
                          }
                          className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-base sm:text-sm"
                        />
                        {dateErrors[row.userId] && (
                          <span className="mt-1 block text-xs text-destructive">{dateErrors[row.userId]}</span>
                        )}
                      </label>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-muted-foreground">Amount</span>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {row.total === null ? "—" : formatINR(row.total)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded((current) => ({ ...current, [row.userId]: !isExpanded }))}
                    className="flex min-h-11 w-full items-center justify-between border-t border-border px-4 text-sm font-semibold text-primary"
                    aria-expanded={Boolean(isExpanded)}
                    aria-controls={detailsId}
                  >
                    Payment details
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {isExpanded && (
                    <div id={detailsId} className="p-3 pt-0">
                      <PaymentDetails payee={payee} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="mt-6 hidden md:block overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px]">
                <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Person</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Daily remuneration</th>
                    <th className="px-4 py-3">Effective from</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="w-14 px-4 py-3"><span className="sr-only">Details</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => {
                    const isExpanded = expanded[row.userId];
                    const detailsId = `desktop-payment-details-${safeDomId(row.userId)}`;
                    return (
                      <tr key={row.userId} className="group">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-foreground">{row.userName}</p>
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${row.dailyRate === null ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                            {row.dailyRate === null ? "Needs remuneration" : "Ready"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">{row.present}</span> present
                          <span className="mx-2">·</span>{row.absent} absent
                        </td>
                        <td className="px-4 py-4">
                          <div className="w-36">
                            <RemunerationRateField
                              userId={row.userId}
                              userName={row.userName}
                              value={rateDrafts[row.userId] ?? ""}
                              error={rateErrors[row.userId] ?? null}
                              onChange={(value) => updateRateDraft(row.userId, value)}
                              idSuffix="desktop"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="date"
                            aria-label={`Effective from for ${row.userName}`}
                            value={effectiveDateDrafts[row.userId] ?? ""}
                            min={semesterQuery.data?.startDate.slice(0, 10)}
                            max={semesterQuery.data?.endDate.slice(0, 10)}
                            onChange={(event) =>
                              setEffectiveDateDrafts((current) => ({
                                ...current,
                                [row.userId]: event.target.value,
                              }))
                            }
                            className="min-h-11 w-40 rounded-xl border border-input bg-background px-3 text-sm"
                          />
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-foreground">
                          {row.total === null ? "—" : formatINR(row.total)}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => setExpanded((current) => ({ ...current, [row.userId]: !isExpanded }))}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={`${isExpanded ? "Hide" : "Show"} payment details for ${row.userName}`}
                            aria-expanded={Boolean(isExpanded)}
                            aria-controls={detailsId}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.filter((row) => expanded[row.userId]).map((row) => (
              <div
                key={`${row.userId}-details`}
                id={`desktop-payment-details-${safeDomId(row.userId)}`}
                className="border-t border-border p-5"
              >
                <p className="mb-3 text-sm font-semibold text-foreground">{row.userName} · payment details</p>
                <PaymentDetails payee={payeeById.get(row.userId)} />
              </div>
            ))}
          </div>
        </>
      )}
    </WorkspacePage>
  );
};

export default Remuneration;
