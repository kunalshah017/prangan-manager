import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFile(new URL(`../../${path}`, import.meta.url), "utf8");

describe("expense query contracts", () => {
  it("keeps list filters scoped and payment amounts server-owned", async () => {
    const [types, hooks] = await Promise.all([
      source("types/api.ts"),
      source("hooks/useExpenseQueries.ts"),
    ]);

    expect(types).toContain("export interface Expense");
    expect(types).toContain("ExpenseTotals");
    expect(types).toContain('"PAID" | "ALREADY_PAID" | "INCOMPLETE" | "NO_PAYMENT_DUE"');
    expect(hooks).toContain("export const useExpenses");
    expect(hooks).toMatch(/enabled:\s*params\.enabled !== false/);
    expect(hooks).toContain("export const useCreateManualExpense");
    expect(hooks).toContain("export const useVoidExpense");
    expect(hooks).toContain("export const useMarkRemunerationPaid");
    expect(hooks).toContain('"/expenses/remuneration-payments"');
    expect(hooks).toContain("userIds");
    expect(hooks).toContain("month");
    expect(hooks).not.toMatch(/remuneration-payments[\s\S]{0,300}\bamount\b/);
  });

  it("invalidates both ledger and remuneration data after payment", async () => {
    const hooks = await source("hooks/useExpenseQueries.ts");

    expect(hooks).toMatch(/queryKey:\s*\["expenses",\s*params\]/);
    expect(hooks).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\["expenses"\]/);
    expect(hooks).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\["attendance"/);
    expect(hooks).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\["remuneration-users"/);
  });
});
