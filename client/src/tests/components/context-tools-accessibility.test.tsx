import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { buildNavigationModel } from "@/lib/navigation";
import type { User } from "@/types/api";

const admin: User = {
  id: "admin-1",
  name: "Admin",
  firstName: "Admin",
  email: "admin@example.test",
  role: "ADMIN",
  status: "APPROVED",
  roleAssignments: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("context tools navigation", () => {
  it("keeps project, center, and semester tools out of mobile navigation", () => {
    const model = buildNavigationModel(admin);
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <MobileNavigation
          open
          onClose={() => undefined}
          projects={[]}
          user={admin}
          model={model}
          canViewWorkspace={false}
          currentProjectId="project-1"
          onLogout={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(markup).not.toContain("Project tools");
    expect(markup).not.toContain("Center tools");
    expect(markup).not.toContain("Semester tools");
  });
});
