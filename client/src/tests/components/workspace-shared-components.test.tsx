// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { EntityAvatar } from "@/components/workspace/EntityAvatar";
import { EntityList, EntityRow } from "@/components/workspace/EntityList";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { projectStatus, semesterTiming, sortCentresByRecentUpdate } from "@/lib/workspace-display";
import type { Center } from "@/types/api";

describe("shared workspace components", () => {
  it("renders a row as one named link with no edit control", () => {
    render(
      <MemoryRouter>
        <EntityList label="Centres">
          <EntityRow href="/projects/p/centers/c/dashboard" title="Lavender" meta="Dombivli" />
        </EntityList>
      </MemoryRouter>,
    );
    expect(screen.getByRole("list", { name: "Centres" })).toBeTruthy();
    const link = screen.getByRole("link", { name: "Lavender" });
    expect(link.getAttribute("href")).toBe("/projects/p/centers/c/dashboard");
    expect(screen.queryByRole("link", { name: /edit/i })).toBeNull();
  });

  it("shows a row without href as text with nothing to open", () => {
    const { container } = render(
      <MemoryRouter>
        <EntityList label="Semesters">
          <EntityRow title="Semester 2025-26" status={<StatusBadge tone="ended" label="Ended" />} />
        </EntityList>
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Semester 2025-26");
    expect(container.querySelector("a")).toBeNull();
  });

  it("gives a flower-named centre its own colour and initials", () => {
    const { container } = render(<EntityAvatar name="Lavender" />);
    const avatar = container.firstElementChild as HTMLElement;
    expect(avatar.textContent).toBe("L");
    expect(avatar.getAttribute("style")).toContain("300");
  });

  it("labels status with text, not colour alone", () => {
    render(<StatusBadge {...projectStatus("INACTIVE")} />);
    expect(screen.getByText("Inactive")).toBeTruthy();
    expect(projectStatus(undefined).label).toBe("Active");
  });

  it("sorts centres newest first without mutating the cached array", () => {
    const centres = [
      { id: "a", updatedAt: "2026-01-01T00:00:00.000Z" },
      { id: "b", updatedAt: "2026-06-01T00:00:00.000Z" },
    ] as Center[];
    expect(sortCentresByRecentUpdate(centres).map((centre) => centre.id)).toEqual(["b", "a"]);
    expect(centres.map((centre) => centre.id)).toEqual(["a", "b"]);
  });

  it("labels a semester by today's date unless it is a draft or archived", () => {
    const dates = { startDate: "2026-07-01T00:00:00.000Z", endDate: "2027-04-30T00:00:00.000Z" };
    const on = (day: string) => new Date(`${day}T12:00:00.000Z`);
    expect(semesterTiming({ ...dates, status: "ACTIVE" }, on("2026-10-29")).label).toBe("Active");
    expect(semesterTiming({ ...dates, status: "ACTIVE" }, on("2026-06-30")).label).toBe("Upcoming");
    expect(semesterTiming({ ...dates, status: "ACTIVE" }, on("2027-05-01")).label).toBe("Ended");
    expect(semesterTiming({ ...dates, status: "DRAFT" }, on("2026-10-29")).label).toBe("Draft");
    expect(semesterTiming({ ...dates, status: "ARCHIVED" }, on("2026-10-29")).label).toBe("Archived");
  });
});
