import { useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  FileText,
  IndianRupee,
  Plus,
  RefreshCw,
  Search,
  Undo2,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

import LoadingButterfly from "@/components/LoadingButterfly";
import { Modal } from "@/components/ui/modal";
import {
  WorkspacePage,
  WorkspacePageHeader,
} from "@/components/workspace/WorkspacePage";
import {
  useCreateManualExpense,
  useExpenses,
  useVoidExpense,
} from "@/hooks/useExpenseQueries";
import { useSemester } from "@/hooks/useSemesterQueries";
import { formatINR, indiaBusinessDate } from "@/lib/remuneration";
import type { Expense } from "@/types/api";

const categories = [
  "Learning materials",
  "Travel",
  "Food and refreshments",
  "Utilities",
  "Events",
  "Maintenance",
  "Other",
];

const today = () => new Date().toISOString().slice(0, 10);
const dateOnly = (value: string) =>
  new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const emptyForm = {
  incurredOn: today(),
  title: "",
  category: "",
  amount: "",
  notes: "",
};

const ExpenseSource = ({ expense }: { expense: Expense }) => (
  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
    <span className="rounded-full bg-muted px-2 py-1 font-medium">
      {expense.expenseType === "REMUNERATION" ? "Attendance payment" : "Manual entry"}
    </span>
    <span>Added by {expense.createdByUser?.name || "Administrator"}</span>
    {expense.status === "VOIDED" && (
      <span className="font-medium text-destructive">
        Voided{expense.voidedByUser?.name ? ` by ${expense.voidedByUser.name}` : ""}
      </span>
    )}
  </div>
);

export const Expenses = () => {
  const { projectId = "", centerId = "", semesterId = "" } = useParams();
  const semester = useSemester(semesterId);
  const [month, setMonth] = useState("");
  const [expenseType, setExpenseType] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [voiding, setVoiding] = useState<Expense | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState("");

  const filters = useMemo(
    () => ({
      projectId,
      centerId,
      semesterId,
      month: month || undefined,
      expenseType: expenseType || undefined,
      category: category || undefined,
      status: (status || undefined) as "ACTIVE" | "VOIDED" | undefined,
      search: search.trim() || undefined,
    }),
    [category, centerId, expenseType, month, projectId, search, semesterId, status],
  );
  const query = useExpenses(filters);
  const createExpense = useCreateManualExpense();
  const voidExpense = useVoidExpense();

  const submitExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || !form.category.trim() || !form.incurredOn) {
      setFormError("Expense date, title, and category are required.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0 || Number(amount.toFixed(2)) !== amount) {
      setFormError("Enter an amount greater than zero with up to two decimal places.");
      return;
    }
    setFormError("");
    try {
      await createExpense.mutateAsync({
        projectId,
        centerId,
        semesterId,
        title: form.title.trim(),
        category: form.category.trim(),
        amount,
        incurredOn: form.incurredOn,
        notes: form.notes.trim() || undefined,
      });
      setAddOpen(false);
      setForm(emptyForm);
      toast.success("Expense added.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Expense could not be added.");
    }
  };

  const confirmVoid = async () => {
    if (!voiding || !voidReason.trim()) {
      setVoidError("Void reason is required.");
      return;
    }
    setVoidError("");
    try {
      await voidExpense.mutateAsync({
        expenseId: voiding.id,
        voidReason: voidReason.trim(),
      });
      setVoiding(null);
      setVoidReason("");
      toast.success("Expense voided.");
    } catch (error) {
      setVoidError(error instanceof Error ? error.message : "Expense could not be voided.");
    }
  };

  const data = query.data;
  const semesterStart = semester.data?.startDate.slice(0, 10);
  const semesterEnd = semester.data?.endDate.slice(0, 10);
  const summaryCards: Array<{
    label: string;
    amount: number;
    Icon: LucideIcon;
  }> = [
    {
      label: "Total active expenses",
      amount: data?.totals.active ?? 0,
      Icon: WalletCards,
    },
    {
      label: "Remuneration",
      amount: data?.totals.remuneration ?? 0,
      Icon: Banknote,
    },
    {
      label: "Manual expenses",
      amount: data?.totals.manual ?? 0,
      Icon: FileText,
    },
  ];

  if (query.isLoading || semester.isLoading) return <LoadingButterfly />;

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        title="Expenses"
        badge={semester.data?.name}
        description="A dated ledger of this semester’s remuneration and operational spending."
        action={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add expense
          </button>
        }
      />

      {query.error || semester.error ? (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          <h2 className="mt-3 font-semibold">Expenses could not be loaded</h2>
          <p className="mt-1 text-sm text-muted-foreground">Check your connection, then try again.</p>
          <button
            type="button"
            onClick={() => void Promise.all([query.refetch(), semester.refetch()])}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Expense totals">
            {summaryCards.map(({ label, amount, Icon }) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {label}
                </div>
                <p className="mt-3 text-2xl font-semibold tabular-nums">{formatINR(amount)}</p>
              </div>
            ))}
          </section>

          <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label>
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Expense month</span>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="min-h-11 w-full rounded-xl border bg-background px-3" />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Expense type</span>
                <select value={expenseType} onChange={(e) => setExpenseType(e.target.value)} className="min-h-11 w-full rounded-xl border bg-background px-3">
                  <option value="">All types</option>
                  <option value="REMUNERATION">Remuneration</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Category</span>
                <input value={category} onChange={(e) => setCategory(e.target.value)} list="expense-category-filters" placeholder="All categories" className="min-h-11 w-full rounded-xl border bg-background px-3" />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-11 w-full rounded-xl border bg-background px-3">
                  <option value="">Active expenses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="VOIDED">Voided</option>
                </select>
              </label>
              <label className="relative">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Search expenses</span>
                <Search className="pointer-events-none absolute bottom-3.5 left-3 h-4 w-4 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title, notes, payee" className="min-h-11 w-full rounded-xl border bg-background pl-9 pr-3" />
              </label>
            </div>
            <datalist id="expense-category-filters">{categories.map((item) => <option key={item} value={item} />)}</datalist>
          </section>

          {!data?.expenses.length ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <IndianRupee className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-3 font-semibold">No expenses found</h2>
              <p className="mt-1 text-sm text-muted-foreground">Adjust the filters or add the semester’s first manual expense.</p>
            </div>
          ) : (
            <>
              <div className="mt-6 hidden md:block">
                <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Expense</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.expenses.map((expense) => (
                        <tr key={expense.id} className="align-top hover:bg-muted/30">
                          <td className="whitespace-nowrap px-4 py-4">{dateOnly(expense.incurredOn)}</td>
                          <td className="max-w-sm px-4 py-4"><p className="font-semibold">{expense.title}</p>{expense.notes && <p className="mt-1 text-muted-foreground">{expense.notes}</p>}<ExpenseSource expense={expense} /></td>
                          <td className="px-4 py-4">{expense.category}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums">{formatINR(expense.amount)}</td>
                          <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${expense.status === "ACTIVE" ? "bg-success/15 text-success-foreground" : "bg-destructive/10 text-destructive"}`}>{expense.status === "ACTIVE" ? "Active" : "Voided"}</span>{expense.voidReason && <p className="mt-2 max-w-xs text-xs text-muted-foreground">{expense.voidReason}</p>}</td>
                          <td className="px-4 py-3 text-right">{expense.expenseType === "MANUAL" && expense.status === "ACTIVE" && <button type="button" onClick={() => setVoiding(expense)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-destructive/10">Void expense</button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 space-y-3 md:hidden">
                {data.expenses.map((expense) => (
                  <article key={expense.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" />{dateOnly(expense.incurredOn)}</p><h2 className="mt-2 font-semibold">{expense.title}</h2><p className="mt-1 text-sm text-muted-foreground">{expense.category}</p></div>
                      <p className="shrink-0 text-lg font-semibold tabular-nums">{formatINR(expense.amount)}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${expense.status === "ACTIVE" ? "bg-success/15 text-success-foreground" : "bg-destructive/10 text-destructive"}`}>
                        {expense.status === "ACTIVE" ? "Active" : "Voided"}
                      </span>
                      {expense.status === "VOIDED" && expense.voidedAt && (
                        <span className="text-xs text-muted-foreground">
                          Voided {dateOnly(indiaBusinessDate(expense.voidedAt) ?? "")}
                        </span>
                      )}
                    </div>
                    <ExpenseSource expense={expense} />
                    {expense.notes && <p className="mt-3 text-sm text-muted-foreground">{expense.notes}</p>}
                    {expense.voidReason && (
                      <p className="mt-3 rounded-xl bg-destructive/5 p-3 text-sm text-destructive">
                        <span className="font-semibold">Void reason:</span>{" "}
                        {expense.voidReason}
                      </p>
                    )}
                    {expense.expenseType === "MANUAL" && expense.status === "ACTIVE" && <button type="button" onClick={() => setVoiding(expense)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/25 font-semibold text-destructive"><Undo2 className="h-4 w-4" />Void expense</button>}
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <Modal isOpen={addOpen} onClose={() => !createExpense.isPending && setAddOpen(false)} title="Add manual expense" className="max-h-[90dvh] overflow-y-auto rounded-b-none sm:rounded-lg">
        <form onSubmit={submitExpense} className="space-y-4">
          <label className="block"><span className="mb-1 block text-sm font-semibold">Expense date</span><input type="date" min={semesterStart} max={semesterEnd} value={form.incurredOn} onChange={(e) => setForm({ ...form, incurredOn: e.target.value })} className="min-h-11 w-full rounded-xl border bg-background px-3" /></label>
          <label className="block"><span className="mb-1 block text-sm font-semibold">Title</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} className="min-h-11 w-full rounded-xl border bg-background px-3" /></label>
          <label className="block"><span className="mb-1 block text-sm font-semibold">Category</span><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} list="expense-category-suggestions" className="min-h-11 w-full rounded-xl border bg-background px-3" /><datalist id="expense-category-suggestions">{categories.map((item) => <option key={item} value={item} />)}</datalist></label>
          <label className="block"><span className="mb-1 block text-sm font-semibold">Amount</span><div className="relative"><IndianRupee className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input type="number" inputMode="decimal" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="min-h-11 w-full rounded-xl border bg-background pl-9 pr-3" /></div></label>
          <label className="block"><span className="mb-1 block text-sm font-semibold">Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={1000} rows={3} className="w-full rounded-xl border bg-background p-3" /></label>
          {formError && <p role="alert" className="text-sm font-medium text-destructive">{formError}</p>}
          <div className="flex gap-3"><button type="button" onClick={() => setAddOpen(false)} className="min-h-11 flex-1 rounded-xl border font-semibold">Cancel</button><button type="submit" disabled={createExpense.isPending} className="min-h-11 flex-1 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50">{createExpense.isPending ? "Adding…" : "Add expense"}</button></div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(voiding)} onClose={() => !voidExpense.isPending && setVoiding(null)} title="Void expense">
        <p className="text-sm text-muted-foreground">The ledger record stays available for audit. Add a clear correction reason.</p>
        <label className="mt-4 block"><span className="mb-1 block text-sm font-semibold">Void reason</span><textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} rows={3} className="w-full rounded-xl border bg-background p-3" /></label>
        {voidError && <p role="alert" className="mt-2 text-sm font-medium text-destructive">{voidError}</p>}
        <div className="mt-5 flex gap-3"><button type="button" onClick={() => setVoiding(null)} className="min-h-11 flex-1 rounded-xl border font-semibold">Cancel</button><button type="button" onClick={() => void confirmVoid()} disabled={voidExpense.isPending} className="min-h-11 flex-1 rounded-xl bg-destructive font-semibold text-white disabled:opacity-50">{voidExpense.isPending ? "Voiding…" : "Void expense"}</button></div>
      </Modal>
    </WorkspacePage>
  );
};

export default Expenses;
