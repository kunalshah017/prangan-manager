import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const page = (name: string) =>
  readFile(new URL(`../../pages/${name}`, import.meta.url), "utf8");

describe("public page navigation", () => {
  it("keeps explicit return paths on every non-root public flow", async () => {
    const [login, register, reset, tokenForm, notFound] = await Promise.all([
      page("Login.tsx"),
      page("Register.tsx"),
      page("ResetPassword.tsx"),
      page("AccountTokenForm.tsx"),
      readFile(
        new URL("../../components/NotFoundPage.tsx", import.meta.url),
        "utf8",
      ),
    ]);

    expect(login).toContain("Back to welcome");
    expect(register).toContain("Back to welcome");
    expect(reset).toContain("Back to sign in");
    expect(tokenForm).toContain("Back to sign in");
    expect(notFound).toContain("Go to projects");
    for (const source of [login, register, reset, tokenForm, notFound]) {
      expect(source).toContain("StandalonePageNavigation");
    }
  });

  it("treats the welcome screen as the intentional public root", async () => {
    const home = await page("Home.tsx");

    expect(home).toContain('to="/login"');
    expect(home).toContain('to="/register"');
    expect(home).not.toContain("Back to");
  });

  it("gives access-denied screens a safe route back into the application", async () => {
    const [protectedRoute, app] = await Promise.all([
      readFile(
        new URL("../../components/ProtectedRoute.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../../App.tsx", import.meta.url), "utf8"),
    ]);

    expect(protectedRoute).toContain("StandalonePageNavigation");
    expect(protectedRoute).toContain('currentLabel="Access denied"');
    expect(protectedRoute).toContain('backLabel="Back to projects"');
    expect(protectedRoute).toContain("standaloneDenied = false");
    expect(protectedRoute).toContain("standaloneDenied &&");
    expect(protectedRoute).toContain("standaloneDenied ? (");
    expect(protectedRoute).toContain(
      '<section aria-labelledby="access-denied-title"',
    );
    expect(protectedRoute).toContain('id="access-denied-title"');
    expect(app).toMatch(
      /path="\/administration"[\s\S]*?<ProtectedRoute requireAdmin standaloneDenied>/,
    );
    expect(app).toMatch(
      /path="\/users"[\s\S]*?<ProtectedRoute requireAdmin standaloneDenied>/,
    );
    expect(app).toMatch(
      /path="\/library\/:bookId"[\s\S]*?<ProtectedRoute standaloneDenied>/,
    );
  });
});
