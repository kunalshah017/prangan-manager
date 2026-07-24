import { describe, expect, it } from "vitest";

import { readLoginPrefill } from "@/lib/login-params";

describe("readLoginPrefill", () => {
  it("returns only email when email and password are present", () => {
    const params = new URLSearchParams({
      email: "a@b.com",
      password: "secret",
    });

    expect(readLoginPrefill(params)).toEqual({ email: "a@b.com" });
  });

  it("returns an empty object when only password is present", () => {
    const params = new URLSearchParams({ password: "secret" });

    expect(readLoginPrefill(params)).toEqual({});
  });

  it("returns email when only email is present", () => {
    const params = new URLSearchParams({ email: "a@b.com" });

    expect(readLoginPrefill(params)).toEqual({ email: "a@b.com" });
  });

  it("returns an empty object when email is empty", () => {
    const params = new URLSearchParams({ email: "" });

    expect(readLoginPrefill(params)).toEqual({});
  });
});