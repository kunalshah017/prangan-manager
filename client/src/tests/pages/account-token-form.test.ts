import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("account token form", () => {
  it("captures a lifecycle token once before replacing the URL", async () => {
    const source = await readFile(
      new URL("../../pages/AccountTokenForm.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("const hasCapturedToken = useRef(false)");
    expect(source).toContain("if (hasCapturedToken.current) return;");
    expect(source).toContain('setToken(searchParams.get("token"))');
    expect(source).toContain("setSearchParams({}, { replace: true })");
  });
});
