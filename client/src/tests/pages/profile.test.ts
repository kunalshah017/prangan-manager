import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const profilePath = new URL("../../pages/Profile.tsx", import.meta.url);
const settingsPath = new URL(
  "../../pages/AccountSettings.tsx",
  import.meta.url,
);
const profile = readFileSync(profilePath, "utf8");
const view = readFileSync(
  new URL("../../components/users/UserProfileView.tsx", import.meta.url),
  "utf8",
);
const details = readFileSync(
  new URL("../../pages/users/UserDetails.tsx", import.meta.url),
  "utf8",
);

describe("unified profile workspace", () => {
  it("owns personal, photo, payment and app-data workflows", () => {
    for (const sourceToken of [
      "ImageUpload",
      "useUpdateMyProfile",
      "useUpdateBankDetails",
      "ifsc.razorpay.com",
      "Edit details",
      "Edit payment details",
    ]) {
      expect(profile).toContain(sourceToken);
    }
    expect(profile).toMatch(/"confirmBankAccountNumber",\s*"Confirm account number",\s*"text"/);
    expect(profile).toMatch(/"bankAccountNumber",\s*"Account number",\s*"password"/);
    expect(existsSync(settingsPath)).toBe(false);
  });

  it("renders your profile and an admin's view of a user through one shared view", () => {
    expect(profile).toContain("<UserProfileView user={user} isSelf");
    expect(details).toContain("<UserProfileView");
    expect(details).toContain("isSelf={false}");
    // Nobody has two versions of their own page.
    expect(details).toContain('<Navigate to="/profile" replace />');
    // The admin view is read-only and never handles the full account number.
    expect(details).not.toContain("useUpdateBankDetails");
    expect(details).not.toContain("bankAccountNumber");
    expect(details).toContain("bank?.accountLast4");
  });

  it("shows assignments from managed semester-level metadata", () => {
    expect(view).toContain("levelName(assignment.semesterLevel)");
    expect(view).not.toContain("assignment.level)");
  });

  it("opens the Payments tab for #payment links", () => {
    expect(view).toContain('location.hash === "#payment" ? "payments" : "about"');
    expect(view).toContain('<div id="payment">');
  });

  it("uses accessible tabs with month-by-month activity", () => {
    expect(view).toContain('role="tablist"');
    expect(view).toContain("aria-selected={tab === item.id}");
    expect(view).toContain("<MonthlyActivity");
    expect(profile).not.toContain("CacheManagementModal");
    expect(profile).not.toContain("AppVersion");
  });
});

describe("profile routes and navigation", () => {
  const routes = readFileSync(
    new URL("../../App.tsx", import.meta.url),
    "utf8",
  );
  const layout = readFileSync(
    new URL("../../components/Layout.tsx", import.meta.url),
    "utf8",
  );
  const mobile = readFileSync(
    new URL(
      "../../components/navigation/MobileNavigation.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const settings = readFileSync(
    new URL("../../pages/Settings.tsx", import.meta.url),
    "utf8",
  );

  it("serves settings separately and keeps bank links on profile payment", () => {
    expect(routes).toContain(
      "const Settings = lazy(() => import('./pages/Settings'))",
    );
    expect(routes).toContain(
      '<Route path="settings" element={<Settings />} />',
    );
    expect(routes).toContain(
      '<Route path="bank" element={<Navigate to="/profile#payment" replace />} />',
    );
    // App upkeep lives on the Settings page itself, with a confirmed reset.
    expect(settings).toContain("useAppMaintenance");
    expect(settings).toContain('variant="danger"');
    expect(settings).toContain("AppVersion");
  });

  it("links settings from desktop and mobile account navigation", () => {
    expect(layout).toContain("/profile/settings");
    expect(layout).toContain("Settings");
    expect(mobile).toContain("/profile/settings");
    expect(mobile).toContain("Settings");
    expect(mobile).toContain('to="/profile"');
    expect(mobile).toContain("Profile");
  });
});
