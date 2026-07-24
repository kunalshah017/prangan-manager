import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("public entry flow", () => {
  it("uses a shared public frame with clear recovery and form affordances", async () => {
    const home = await readFile(
      new URL("../../pages/Home.tsx", import.meta.url),
      "utf8",
    );
    const login = await readFile(
      new URL("../../pages/Login.tsx", import.meta.url),
      "utf8",
    );
    const register = await readFile(
      new URL("../../pages/Register.tsx", import.meta.url),
      "utf8",
    );

    expect(home).toContain("Register");
    expect(home).toContain("heroImages");
    expect(home).toContain("For the people who make learning happen");
    expect(home).toContain("prangan-logo-dark-mode.png");
    expect(home).toContain("AnimatePresence");
    expect(login).toContain("Back to welcome");
    expect(login).toContain("Sign in");
    expect(login).toContain("Prangan Manager workspace");
    expect(login).not.toContain("Welcome back");
    expect(login).not.toContain("Sign in to Prangan Manager");
    expect(login).toContain('"Show password"');
    expect(login).toContain('"Hide password"');
    expect(register).toContain("Back to welcome");
    expect(register).toContain("Register for Prangan");
    expect(register).toContain("Prangan Manager workspace");
    expect(register).not.toContain("Join the workspace");
    expect(register).not.toContain("Tell us about yourself");
    expect(register).toContain('role="alert"');
  });
});
