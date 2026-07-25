import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("expense routing", () => {
  it("protects the exact route and exposes it only through the admin dashboard", async () => {
    const [app, dashboard, breadcrumbs] = await Promise.all([
      readFile(new URL("../../App.tsx", import.meta.url), "utf8"),
      readFile(new URL("../../lib/dashboard.ts", import.meta.url), "utf8"),
      readFile(new URL("../../lib/breadcrumbs.ts", import.meta.url), "utf8"),
    ]);

    expect(app).toMatch(
      /path=":projectId\/centers\/:centerId\/semesters\/:semesterId\/dashboard\/expenses"[\s\S]*?<ProtectedRoute requireAdmin>[\s\S]*?<Expenses \/>/,
    );
    expect(dashboard).toContain('"Expenses"');
    expect(dashboard).toContain("/dashboard/expenses");
    expect(dashboard).toMatch(/user\?\.role === "ADMIN"[\s\S]*?"Expenses"/);
    expect(breadcrumbs).toContain('section === "expenses"');
    expect(breadcrumbs).toContain('current("Expenses")');
  });
});
