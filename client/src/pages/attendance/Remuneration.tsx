import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  Clock3,
  Search,
  Settings2,
  Users,
  WalletCards,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import LoadingButterfly from "@/components/LoadingButterfly";
import { ProfilePicture } from "@/components/ui";
import {
  WorkspacePage,
  WorkspacePageHeader,
} from "@/components/workspace/WorkspacePage";
import { useAttendanceRecords } from "@/hooks/useAttendanceQueries";
import {
  useExpenses,
  useMarkRemunerationPaid,
} from "@/hooks/useExpenseQueries";
import { useSemester } from "@/hooks/useSemesterQueries";
import { useRemunerationUsers } from "@/hooks/useUserQueries";
import {
  buildMonthlyRemunerationSummary,
  buildRemunerationRows,
  clampRangeToSemester,
  enumerateSemesterMonths,
  formatINR,
  getMonthRange,
  selectDefaultSemesterMonth,
} from "@/lib/remuneration";
import type {
  Expense,
  RemunerationPaymentResult,
  RemunerationPeriod,
  RemunerationUser,
} from "@/types/api";
import { useAuthStore } from "@/stores/authStore";

type PaymentState = "READY" | "INCOMPLETE" | "NO_PAYMENT_DUE" | "PAID";

const stateLabel: Record<PaymentState, string> = {
  READY: "Ready",
  INCOMPLETE: "Incomplete",
  NO_PAYMENT_DUE: "No payment due",
  PAID: "Paid",
};

const stateStyle: Record<PaymentState, string> = {
  READY: "bg-primary/10 text-primary",
  INCOMPLETE: "bg-warning/25 text-warning-foreground",
  NO_PAYMENT_DUE: "bg-muted text-muted-foreground",
  PAID: "bg-success/15 text-success-foreground",
};

const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const scheduleLabel = (
  periods: RemunerationPeriod[] | undefined,
  startDate: string,
  endDate: string,
) => {
  const applicable = (periods ?? []).filter(
    (item) =>
      item.effectiveFrom <= endDate &&
      (item.effectiveTo === null || item.effectiveTo >= startDate),
  );
  if (!applicable.length) return "No applicable remuneration";
  return applicable
    .map(
      (item) =>
        `${formatINR(item.amountPerDay)}/day from ${dateLabel(item.effectiveFrom)}${
          item.effectiveTo ? ` to ${dateLabel(item.effectiveTo)}` : ""
        }`,
    )
    .join(" · ");
};

const PaidDetails = ({ expense }: { expense?: Expense }) =>
  expense ? (
    <p className="mt-1 text-xs text-muted-foreground">
      {formatINR(expense.amount)} paid {dateLabel(expense.createdAt)}
    </p>
  ) : null;

const CopyField = ({ label, value }: { label: string; value?: string | null }) => {
  const [copied, setCopied] = useState(false);
  const displayValue = value || "Not added";

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be unavailable outside a secure browser context.
    }
  };

  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 flex min-w-0 items-center gap-2">
        <span className="min-w-0 break-all font-medium">{displayValue}</span>
        {value && (
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Copy ${label}`}
            title={`Copy ${label}`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        )}
      </dd>
    </div>
  );
};

const BankPaymentDetails = ({
  payee,
  amount,
}: {
  payee?: RemunerationUser;
  amount: number | null;
}) => {
  const [qrCode, setQrCode] = useState("");
  const hasBankDetails = Boolean(
    payee?.bankAccountNumber ||
      payee?.bankAccountName ||
      payee?.bankIfsc ||
      payee?.bankName ||
      payee?.bankBranch ||
      payee?.upiId,
  );

  useEffect(() => {
    let cancelled = false;
    if (!payee?.upiId || amount === null || amount <= 0) {
      setQrCode("");
      return;
    }

    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(
          `upi://pay?pa=${encodeURIComponent(payee.upiId as string)}&am=${amount.toFixed(2)}&cu=INR`,
          { margin: 1, scale: 4 },
        ),
      )
      .then((dataUrl) => {
        if (!cancelled) setQrCode(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrCode("");
      });

    return () => {
      cancelled = true;
    };
  }, [amount, payee?.upiId]);

  return (
    <details className="mt-4 rounded-xl border border-border/70 bg-background/60">
      <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Payment details
        <span className="float-right text-muted-foreground">{hasBankDetails ? "View" : "Not added"}</span>
      </summary>
      <div className="grid items-start gap-4 border-t px-3 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
        <dl className="grid gap-3">
          <CopyField label="Account number" value={payee?.bankAccountNumber} />
          <CopyField label="Name on account" value={payee?.bankAccountName} />
          <CopyField label="Bank" value={payee?.bankName} />
          <CopyField label="Branch" value={payee?.bankBranch} />
          <CopyField label="IFSC" value={payee?.bankIfsc} />
          <CopyField label="UPI ID" value={payee?.upiId} />
        </dl>
        {qrCode && amount !== null && (
          <div>
            <img src={qrCode} alt={`UPI QR for ${formatINR(amount)}`} className="h-36 w-36 rounded border" />
            <p className="mt-1 text-xs text-muted-foreground">Scan to pay {formatINR(amount)}</p>
          </div>
        )}
      </div>
    </details>
  );
};

const paymentResultMessage = (result: RemunerationPaymentResult) => {
  if (result.message) return result.message;
  if (result.reason === "NOT_ELIGIBLE") {
    return "This person is not eligible in the selected semester.";
  }
  if (result.reason === "MISSING_REMUNERATION") {
    return result.missingDates?.length
      ? `Missing remuneration for ${result.missingDates.join(", ")}.`
      : "One or more present dates have no remuneration.";
  }
  if (result.reason === "PROCESSING_FAILED") {
    return "The payment could not be recorded. Try this person again.";
  }
  return "";
};

export const Remuneration = () => {
  const { projectId = "", centerId = "", semesterId = "" } = useParams();
  const semesterQuery = useSemester(semesterId);
  const isAdmin = useAuthStore((state) => state.user?.role === "ADMIN");
  const [period, setPeriod] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | PaymentState>("ALL");
  const [selected, setSelected] = useState<string[]>([]);
  const [paymentResults, setPaymentResults] = useState<
    RemunerationPaymentResult[]
  >([]);
  const initializedSemester = useRef("");

  const months = useMemo(() => {
    const semester = semesterQuery.data;
    return semester
      ? enumerateSemesterMonths(semester.startDate, semester.endDate)
      : [];
  }, [semesterQuery.data]);

  useEffect(() => {
    const semester = semesterQuery.data;
    if (!semester) return;
    const key = `${semesterId}\0${semester.startDate}\0${semester.endDate}`;
    if (initializedSemester.current === key) return;
    initializedSemester.current = key;
    setPeriod(selectDefaultSemesterMonth(semester.startDate, semester.endDate));
    setSearch("");
    setFilter("ALL");
    setSelected([]);
    setPaymentResults([]);
  }, [semesterId, semesterQuery.data]);

  const range = useMemo(() => {
    const semester = semesterQuery.data;
    if (!semester || !period) return { startDate: "", endDate: "" };
    return period === "FULL"
      ? {
          startDate: semester.startDate.slice(0, 10),
          endDate: semester.endDate.slice(0, 10),
        }
      : clampRangeToSemester(getMonthRange(period), semester);
  }, [period, semesterQuery.data]);

  const attendanceQuery = useAttendanceRecords({
    ...range,
    projectId,
    centerId,
    semesterId,
    page: 1,
    limit: period === "FULL" ? 10000 : 1000,
    enabled: Boolean(range.startDate && range.endDate),
  });
  const payeesQuery = useRemunerationUsers({ projectId, centerId, semesterId });
  const expensesQuery = useExpenses({
    projectId,
    centerId,
    semesterId,
    month: period !== "FULL" ? period : undefined,
    expenseType: "REMUNERATION",
    status: "ACTIVE",
    enabled: isAdmin,
  });
  const pay = useMarkRemunerationPaid();

  const calculation = useMemo(
    () =>
      buildRemunerationRows(
        attendanceQuery.data?.attendances ?? [],
        payeesQuery.data ?? [],
      ),
    [attendanceQuery.data, payeesQuery.data],
  );
  const payees = useMemo(
    () => new Map((payeesQuery.data ?? []).map((item) => [item.id, item])),
    [payeesQuery.data],
  );
  const paidByUser = useMemo(
    () =>
      new Map(
        (expensesQuery.data?.expenses ?? [])
          .filter((expense) => expense.payeeUserId)
          .map((expense) => [expense.payeeUserId as string, expense]),
      ),
    [expensesQuery.data],
  );

  const rows = useMemo(
    () =>
      calculation.rows.map((row) => {
        const paidExpense = paidByUser.get(row.userId);
        const paymentState: PaymentState = paidExpense
          ? "PAID"
          : row.present === 0 || row.total === 0
            ? "NO_PAYMENT_DUE"
            : row.total === null
              ? "INCOMPLETE"
              : "READY";
        return { ...row, paymentState, paidExpense };
      }),
    [calculation.rows, paidByUser],
  );
  const visibleRows = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return rows.filter(
      (row) =>
        (!needle || row.userName.toLocaleLowerCase().includes(needle)) &&
        (filter === "ALL" || row.paymentState === filter),
    );
  }, [filter, rows, search]);
  const readyIds = rows
    .filter((row) => row.paymentState === "READY")
    .map((row) => row.userId);

  useEffect(() => {
    setSelected((current) =>
      current.filter((userId) => readyIds.includes(userId)),
    );
  }, [period, expensesQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitPayment = async (userIds: string[]) => {
    if (period === "FULL" || !userIds.length) return;
    setPaymentResults([]);
    try {
      const response = await pay.mutateAsync({
        projectId,
        centerId,
        semesterId,
        month: period,
        userIds,
      });
      const results = response.results;
      setPaymentResults(results);
      setSelected([]);
    } catch (error) {
      setPaymentResults(
        userIds.map((userId) => ({
          userId,
          status: "INCOMPLETE",
          message:
            error instanceof Error
              ? error.message
              : "Payment could not be recorded.",
        })),
      );
    }
  };

  const semesterSummary = useMemo(() => {
    const semester = semesterQuery.data;
    return semester
      ? buildMonthlyRemunerationSummary(
          calculation.monthlyRows,
          semester.startDate,
          semester.endDate,
        )
      : null;
  }, [calculation.monthlyRows, semesterQuery.data]);

  const loading =
    semesterQuery.isLoading ||
    attendanceQuery.isLoading ||
    payeesQuery.isLoading ||
    expensesQuery.isLoading;
  const error =
    semesterQuery.error ||
    attendanceQuery.error ||
    payeesQuery.error ||
    expensesQuery.error;

  if (loading) return <LoadingButterfly />;
  if (error) {
    return (
      <WorkspacePage>
        <WorkspacePageHeader
          title="Remuneration"
          badge={semesterQuery.data?.name}
          description="Review attendance-based monthly payments."
        />
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <h2 className="mt-3 font-semibold">Remuneration could not be loaded</h2>
          <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
          <button type="button" onClick={() => void Promise.all([semesterQuery.refetch(), attendanceQuery.refetch(), payeesQuery.refetch(), expensesQuery.refetch()])} className="mt-4 min-h-11 rounded-xl border bg-background px-4 font-semibold">Try again</button>
        </div>
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        title="Remuneration"
        badge={semesterQuery.data?.name}
        description="Review attendance, confirm applicable schedules, and record monthly payments."
        action={
          <Link
            to={`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/users`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Settings2 className="h-4 w-4" />
            Manage remuneration settings
          </Link>
        }
      />

      <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-end">
        <label className="flex-1 sm:max-w-xs">
          <span className="mb-1 block text-sm font-semibold">Remuneration month</span>
          <select value={period === "FULL" ? "" : period} onChange={(event) => { setPeriod(event.target.value); setSelected([]); setPaymentResults([]); }} className="min-h-11 w-full rounded-xl border bg-background px-3">
            {period === "FULL" && <option value="">Select a month</option>}
            {months.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => { setPeriod("FULL"); setSelected([]); setPaymentResults([]); }} aria-pressed={period === "FULL"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 font-semibold hover:bg-muted"><CalendarDays className="h-4 w-4" />Full semester</button>
      </section>

      {period === "FULL" && semesterSummary ? (
        <section className="mt-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Semester summary</p>
            <p className="mt-2 text-2xl font-semibold">{semesterSummary.calculatedAmount === null ? "Incomplete remuneration" : formatINR(semesterSummary.calculatedAmount)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{semesterSummary.presentDays} present days across {semesterSummary.months.length} months. Open a month to record payments.</p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {semesterSummary.months.map((month) => (
              <button key={month.month} type="button" onClick={() => setPeriod(month.month)} className="min-h-11 rounded-2xl border border-border bg-card p-4 text-left shadow-sm hover:border-primary/40">
                <p className="font-semibold">{month.label}</p>
                <p className="mt-2 text-lg font-semibold">{month.calculatedAmount === null ? "Incomplete" : formatINR(month.calculatedAmount)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{month.presentDays} present days</p>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className={`mt-6 grid gap-3 ${isAdmin ? "sm:grid-cols-3" : ""}`}>
            <div className="rounded-2xl border bg-card p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expected</p><p className="mt-2 text-2xl font-semibold">{calculation.total === null ? "Incomplete" : formatINR(calculation.total)}</p></div>
            {isAdmin && (
              <>
                <div className="rounded-2xl border bg-card p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ready to pay</p><p className="mt-2 text-2xl font-semibold">{readyIds.length}</p></div>
                <div className="rounded-2xl border bg-card p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paid</p><p className="mt-2 text-2xl font-semibold">{rows.filter((row) => row.paymentState === "PAID").length}</p></div>
              </>
            )}
          </section>

          <section className="mt-5 rounded-2xl border bg-card p-4 shadow-sm">
            <div className={`grid gap-3 ${isAdmin ? "sm:grid-cols-[1fr_190px]" : ""}`}>
              <label className="relative"><span className="sr-only">Search people</span><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people" className="min-h-11 w-full rounded-xl border bg-background pl-9 pr-3" /></label>
              {isAdmin && <label><span className="sr-only">Payment status</span><select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="min-h-11 w-full rounded-xl border bg-background px-3"><option value="ALL">All payment states</option><option value="READY">Ready</option><option value="INCOMPLETE">Incomplete</option><option value="NO_PAYMENT_DUE">No payment due</option><option value="PAID">Paid</option></select></label>}
            </div>
            {isAdmin && <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setSelected(readyIds)} disabled={!readyIds.length || pay.isPending} className="min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50">Select all ready</button>
              <button type="button" onClick={() => void submitPayment(selected)} disabled={!selected.length || pay.isPending} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{pay.isPending ? "Recording payments…" : `Mark selected as paid${selected.length ? ` (${selected.length})` : ""}`}</button>
            </div>}
          </section>

          {paymentResults.length > 0 && (
            <section className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4" aria-live="polite">
              <h2 className="font-semibold">Payment results</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {paymentResults.map((result) => {
                  const detail = paymentResultMessage(result);
                  return <li key={result.userId}><strong>{payees.get(result.userId)?.name ?? result.userId}:</strong> {stateLabel[result.status === "ALREADY_PAID" ? "PAID" : result.status]}{detail ? ` — ${detail}` : ""}</li>;
                })}
              </ul>
            </section>
          )}

          {!visibleRows.length ? (
            <div className="mt-6 rounded-2xl border border-dashed bg-card p-10 text-center"><Users className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">No matching payments</h2><p className="mt-1 text-sm text-muted-foreground">Adjust the filters or record staff attendance.</p></div>
          ) : (
            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              {visibleRows.map((row) => {
                const payee = payees.get(row.userId) as RemunerationUser | undefined;
                const paymentState = row.paymentState;
                return (
                  <article key={row.userId} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><div className="flex items-center gap-3"><ProfilePicture imageUrl={payee?.profileImageUrl ?? undefined} name={row.userName} size="md" colorScheme="orange" /><h2 className="truncate font-semibold">{row.userName}</h2></div><p className="mt-1 text-xs text-muted-foreground">{row.present} present · {row.absent} absent · {row.notAvailable} unavailable</p></div>
                      {isAdmin ? (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stateStyle[paymentState]}`}>{paymentState === "PAID" ? <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> : paymentState === "READY" ? <Clock3 className="mr-1 inline h-3.5 w-3.5" /> : null}{stateLabel[paymentState]}</span>
                      ) : (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentState === "INCOMPLETE" ? stateStyle.INCOMPLETE : paymentState === "NO_PAYMENT_DUE" ? stateStyle.NO_PAYMENT_DUE : stateStyle.READY}`}>
                          {paymentState === "INCOMPLETE" ? "Incomplete" : paymentState === "NO_PAYMENT_DUE" ? "No remuneration due" : "Calculated"}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs font-semibold text-muted-foreground">Calculated amount</p><p className="mt-1 text-lg font-semibold">{row.total === null ? "—" : formatINR(row.total)}</p>{isAdmin && <PaidDetails expense={row.paidExpense} />}</div>
                      <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs font-semibold text-muted-foreground">Applicable schedule</p><p className="mt-1 text-sm font-medium">{scheduleLabel(payee?.remunerationPeriods, range.startDate, range.endDate)}</p></div>
                    </div>
                    {isAdmin && <BankPaymentDetails payee={payee} amount={row.total} />}
                    <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
                      <p className="text-xs text-muted-foreground">
                        {paymentState === "INCOMPLETE"
                          ? "Add missing remuneration in Semester Users."
                          : paymentState === "NO_PAYMENT_DUE"
                            ? "No payable attendance in this month."
                            : isAdmin
                              ? paymentState === "PAID"
                                ? "Recorded in Expenses."
                                : "Ready to record after payment is sent."
                              : "Calculated from recorded attendance and schedule."}
                      </p>
                      {isAdmin && <div className="flex shrink-0 items-center gap-2"><label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-primary/25 bg-primary/5 transition-colors hover:bg-primary/10 focus-within:ring-2 focus-within:ring-ring"><input type="checkbox" aria-label={`Select ${row.userName} for payment`} checked={selected.includes(row.userId)} disabled={paymentState !== "READY" || pay.isPending} onChange={(e) => setSelected((current) => e.target.checked ? [...current, row.userId] : current.filter((id) => id !== row.userId))} className="peer sr-only" /><span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary/40 bg-background transition-colors peer-checked:border-primary peer-checked:bg-primary"><Check className="h-3.5 w-3.5 text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100" /></span><span className="sr-only">Select {row.userName} for payment</span></label><button type="button" onClick={() => void submitPayment([row.userId])} disabled={pay.isPending || paymentState !== "READY"} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"><WalletCards className="h-4 w-4" />Mark as paid</button></div>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </WorkspacePage>
  );
};

export default Remuneration;
