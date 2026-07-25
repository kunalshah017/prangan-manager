import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFile(new URL(`../../${path}`, import.meta.url), "utf8");

describe("administrator expenses page", () => {
  it("provides the complete responsive ledger experience", async () => {
    const page = await source("pages/expenses/Expenses.tsx");

    for (const copy of [
      "Total active expenses",
      "Remuneration",
      "Manual expenses",
      "Add expense",
      "Expense month",
      "Expense type",
      "Category",
      "Status",
      "Search expenses",
      "No expenses found",
      "Try again",
      "Void expense",
      "Void reason",
    ]) {
      expect(page).toContain(copy);
    }
    expect(page).toContain("hidden md:block");
    expect(page).toContain("md:hidden");
    expect(page).toContain("min-h-11");
    expect(page).toContain('role="alert"');
    expect(page).toContain("datalist");
  });

  it("uses controlled native inputs and never offers destructive remuneration actions", async () => {
    const page = await source("pages/expenses/Expenses.tsx");

    expect(page).toContain('type="date"');
    expect(page).toContain('inputMode="decimal"');
    expect(page).toContain('step="0.01"');
    expect(page).toContain("value={form.");
    expect(page).toContain("useCreateManualExpense");
    expect(page).toContain("useVoidExpense");
    expect(page).toContain("indiaBusinessDate(expense.voidedAt)");
    expect(page).not.toContain("expense.voidedAt.slice");
    expect(page).not.toMatch(/delete expense/i);
  });
});
