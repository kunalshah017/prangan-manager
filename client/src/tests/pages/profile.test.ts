import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const profilePath = new URL("../../pages/Profile.tsx", import.meta.url);
const settingsPath = new URL(
  "../../pages/AccountSettings.tsx",
  import.meta.url,
);
const profile = readFileSync(profilePath, "utf8");
const paymentSection = profile.slice(
  profile.indexOf('id="payment"'),
  profile.indexOf("</section>", profile.indexOf('id="payment"')),
);

describe("unified profile workspace", () => {
  it("owns personal, photo, payment, assignment, and app-data workflows", () => {
    for (const sourceToken of [
      "ImageUpload",
      "useUpdateMyProfile",
      "useUpdateBankDetails",
      "ifsc.razorpay.com",
      "Edit profile",
      "Edit payment",
      "Role assignments",
    ]) {
      expect(profile).toContain(sourceToken);
    }
    expect(existsSync(settingsPath)).toBe(false);
  });

  it("displays educator assignments from managed semester-level metadata", () => {
    expect(profile).toContain(
      "levelName(assignment.semesterLevel)",
    );
    expect(profile).not.toContain("assignment.level");
    expect(profile).not.toContain("formatLabel(assignment.level)");
  });

  it("scrolls to payment details after a hash redirect finishes rendering", () => {
    expect(profile).toContain("useLocation()");
    expect(profile).toContain('location.hash !== "#payment"');
    expect(profile).toContain('document.getElementById("payment")?.scrollIntoView');
    expect(profile).toContain("window.requestAnimationFrame");
    expect(profile).toContain("window.cancelAnimationFrame");
  });

  it("uses one responsive workspace without a local breadcrumb or nested parent card", () => {
    expect(profile).toContain("lg:grid-cols-12");
    expect(profile).toContain("lg:col-span-8");
    expect(profile).toContain("lg:col-span-4");
    expect(profile).toContain("min-h-11");
    expect(profile).not.toContain("Breadcrumb");
    expect(profile).not.toContain("bg-gradient-to");
    expect(profile).not.toContain("motion.");
    expect(profile).not.toContain("rounded-2xl");
    expect(profile).not.toContain('<main className="space-y-8');
    expect(paymentSection).toContain("flex-col items-start gap-3 sm:flex-row");
    expect(paymentSection).toContain(
      "w-full shrink-0 items-center justify-center",
    );
    expect(paymentSection).toMatch(
      /"confirmBankAccountNumber",\s*"Confirm account number",\s*"text"/,
    );
    expect(paymentSection).toMatch(
      /"bankAccountNumber",\s*"Account number",\s*"password"/,
    );
    expect(profile).toContain('className="mt-4 grid grid-cols-2 gap-4"');
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
    expect(settings).toContain("CacheManagementModal");
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
