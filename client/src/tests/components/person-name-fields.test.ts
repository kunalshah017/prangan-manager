import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentPath = new URL(
  "../../components/ui/person-name-fields.tsx",
  import.meta.url,
);
const apiTypes = readFileSync(
  new URL("../../types/api.ts", import.meta.url),
  "utf8",
);

describe("structured person names", () => {
  it("provides one accessible controlled field group", () => {
    expect(existsSync(componentPath)).toBe(true);
    if (!existsSync(componentPath)) return;

    const source = readFileSync(componentPath, "utf8");
    for (const token of [
      "First name",
      "Middle name",
      "Last name",
      'autoComplete: "given-name"',
      'autoComplete: "additional-name"',
      'autoComplete: "family-name"',
      'role="alert"',
      "min-h-11",
      "sm:grid-cols-3",
    ]) {
      expect(source).toContain(token);
    }
    expect(source).toContain("firstName: string");
    expect(source).toContain("middleName: string");
    expect(source).toContain("lastName: string");
    expect(source).toContain("required");
  });

  it("retains display name while using canonical request fields", () => {
    expect(apiTypes).toMatch(
      /interface User[\s\S]*?name: string;[\s\S]*?firstName: string;[\s\S]*?middleName\?: string \| null;[\s\S]*?lastName\?: string \| null;/,
    );
    expect(apiTypes).toMatch(
      /interface Student[\s\S]*?name: string;[\s\S]*?firstName: string;[\s\S]*?middleName\?: string \| null;[\s\S]*?lastName\?: string \| null;/,
    );
    expect(apiTypes).toMatch(
      /type VerifyUserRequest = \{[\s\S]*?userId: string;[\s\S]*?status:[\s\S]*?role:[\s\S]*?roleAssignments\?:/,
    );
    const verifyRequest = apiTypes.match(
      /type VerifyUserRequest = \{[\s\S]*?\n\};/,
    )?.[0];
    expect(verifyRequest).not.toContain("email:");
    expect(verifyRequest).not.toContain("name:");
    expect(apiTypes).toMatch(
      /\| "firstName"[\s\S]*?\| "middleName"[\s\S]*?\| "lastName"/,
    );
  });

  it("uses structured inputs on every editable person form", () => {
    const directFormSources = [
      "../../pages/Register.tsx",
      "../../pages/Profile.tsx",
      "../../pages/users/EditUser.tsx",
    ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

    for (const source of directFormSources) {
      expect(source).toContain("PersonNameFields");
      expect(source).toContain("firstName");
      expect(source).toContain("middleName");
      expect(source).toContain("lastName");
    }

    const studentLayout = readFileSync(
      new URL(
        "../../components/students/StudentFormLayout.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    expect(studentLayout).toContain("PersonNameFields");
    for (const path of [
      "../../pages/students/CreateStudent.tsx",
      "../../pages/students/EditStudent.tsx",
    ]) {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");
      expect(source).toContain("StudentFormLayout");
      expect(source).toContain("firstName");
      expect(source).toContain("middleName");
      expect(source).toContain("lastName");
    }

    const verificationHooks = readFileSync(
      new URL("../../hooks/useUserQueries.ts", import.meta.url),
      "utf8",
    );
    expect(verificationHooks).not.toMatch(/email:\s*user\.email/);
    expect(verificationHooks).not.toMatch(/name:\s*user\.name/);
  });
});
