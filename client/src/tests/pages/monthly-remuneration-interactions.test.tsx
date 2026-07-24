// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Remuneration } from "@/pages/attendance/Remuneration";
import type {
  AttendanceRecord,
  RemunerationUser,
  Semester,
} from "@/types/api";

const mocks = vi.hoisted(() => ({
  useAttendanceRecords: vi.fn(),
  useSemester: vi.fn(),
  useRemunerationUsers: vi.fn(),
  useSetRemunerationPeriod: vi.fn(),
  mutateAsync: vi.fn(),
  semesterQuery: {} as Record<string, unknown>,
  attendanceQuery: {} as Record<string, unknown>,
  payeesQuery: {} as Record<string, unknown>,
}));

vi.mock("@/hooks/useAttendanceQueries", () => ({
  useAttendanceRecords: mocks.useAttendanceRecords,
}));
vi.mock("@/hooks/useSemesterQueries", () => ({
  useSemester: mocks.useSemester,
}));
vi.mock("@/hooks/useUserQueries", () => ({
  useRemunerationUsers: mocks.useRemunerationUsers,
  useSetRemunerationPeriod: mocks.useSetRemunerationPeriod,
}));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/components/LoadingButterfly", () => ({
  default: () => <div>Loading remuneration</div>,
}));

const semester = (
  overrides: Partial<Semester> = {},
): Semester => ({
  id: "semester-1",
  name: "Semester One",
  startDate: "2020-01-10",
  endDate: "2020-02-20",
  centerId: "center-1",
  status: "ACTIVE",
  createdAt: "2020-01-01T00:00:00Z",
  updatedAt: "2020-01-01T00:00:00Z",
  ...overrides,
});

const payee = (
  id: string,
  name: string,
  dailyRate: number | null,
): RemunerationUser => ({
  id,
  name,
  firstName: name,
  dailyRate,
});

const attendance = (
  overrides: Partial<AttendanceRecord> = {},
): AttendanceRecord => ({
  id: "attendance-1",
  userId: "user-1",
  userName: "Asha",
  userEmail: "asha@example.test",
  date: "2020-02-03",
  status: "PRESENT",
  roleAssignmentId: "assignment-1",
  projectId: "project-1",
  projectName: "Project One",
  centerId: "center-1",
  centerName: "Center One",
  semesterId: "semester-1",
  semesterName: "Semester One",
  roleAssignment: { id: "assignment-1", subRole: "EDUCATOR" },
  createdAt: "2020-02-03T00:00:00Z",
  updatedAt: "2020-02-03T00:00:00Z",
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter
      initialEntries={[
        "/projects/project-1/centers/center-1/semesters/semester-1/dashboard/attendance/remuneration",
      ]}
    >
      <Routes>
        <Route
          path="/projects/:projectId/centers/:centerId/semesters/:semesterId/dashboard/attendance/remuneration"
          element={<Remuneration />}
        />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  mocks.mutateAsync.mockReset().mockResolvedValue({});
  mocks.useAttendanceRecords.mockReset();
  mocks.useSemester.mockReset();
  mocks.useRemunerationUsers.mockReset();
  mocks.useSetRemunerationPeriod.mockReset();

  mocks.semesterQuery = {
    data: semester(),
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.attendanceQuery = {
    data: { attendances: [attendance()], totalCount: 1, page: 1, totalPages: 1 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.payeesQuery = {
    data: [payee("user-1", "Asha", 100), payee("user-2", "Dev", null)],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.useSemester.mockImplementation(() => mocks.semesterQuery);
  mocks.useAttendanceRecords.mockImplementation(() => mocks.attendanceQuery);
  mocks.useRemunerationUsers.mockImplementation(() => mocks.payeesQuery);
  mocks.useSetRemunerationPeriod.mockImplementation(() => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
  }));
});

afterEach(cleanup);

describe("remuneration page interactions", () => {
  it("requests the default month range, then switches full semester and back", async () => {
    renderPage();

    await waitFor(() =>
      expect(mocks.useAttendanceRecords).toHaveBeenLastCalledWith(
        expect.objectContaining({
          startDate: "2020-02-01",
          endDate: "2020-02-20",
          enabled: true,
        }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Full semester" }));
    await waitFor(() =>
      expect(mocks.useAttendanceRecords).toHaveBeenLastCalledWith(
        expect.objectContaining({
          startDate: "2020-01-10",
          endDate: "2020-02-20",
          limit: 10000,
        }),
      ),
    );

    fireEvent.change(screen.getByLabelText("Remuneration month"), {
      target: { value: "2020-01" },
    });
    await waitFor(() =>
      expect(mocks.useAttendanceRecords).toHaveBeenLastCalledWith(
        expect.objectContaining({
          startDate: "2020-01-10",
          endDate: "2020-01-31",
          limit: 1000,
        }),
      ),
    );
  });

  it("resets period, filters, and disclosures when semester dates change", async () => {
    const view = renderPage();
    await screen.findAllByText("Asha");

    fireEvent.change(screen.getByPlaceholderText("Search people"), {
      target: { value: "Asha" },
    });
    fireEvent.change(screen.getByLabelText("Payment readiness"), {
      target: { value: "READY" },
    });
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Payment details",
      })[0],
    );

    mocks.semesterQuery = {
      ...mocks.semesterQuery,
      data: semester({
        startDate: "2020-03-02",
        endDate: "2020-04-09",
        updatedAt: "2020-02-01T00:00:00Z",
      }),
    };
    view.rerender(
      <MemoryRouter
        initialEntries={[
          "/projects/project-1/centers/center-1/semesters/semester-1/dashboard/attendance/remuneration",
        ]}
      >
        <Routes>
          <Route
            path="/projects/:projectId/centers/:centerId/semesters/:semesterId/dashboard/attendance/remuneration"
            element={<Remuneration />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        (screen.getByLabelText("Remuneration month") as HTMLSelectElement)
          .value,
      ).toBe("2020-04");
      expect(
        (screen.getByPlaceholderText("Search people") as HTMLInputElement)
          .value,
      ).toBe("");
      expect(
        (screen.getByLabelText("Payment readiness") as HTMLSelectElement)
          .value,
      ).toBe("ALL");
      expect(
        screen
          .getAllByRole("button", { name: "Payment details" })[0]
          .getAttribute("aria-expanded"),
      ).toBe("false");
    });
  });

  it("previews a valid draft but keeps full-semester totals persisted until save", async () => {
    renderPage();
    const rateInputs = await screen.findAllByLabelText("Daily remuneration for Asha");

    fireEvent.change(screen.getAllByLabelText(/Effective from/)[0], {
      target: { value: "2020-02-01" },
    });
    fireEvent.change(rateInputs[0], { target: { value: "200" } });
    expect(await screen.findByText("Unsaved remuneration changes")).toBeTruthy();
    expect(screen.getAllByText("₹200.00").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Full semester" }));
    expect(await screen.findByText(/saved schedule/i)).toBeTruthy();
    expect(screen.getAllByText("₹100.00").length).toBeGreaterThan(0);
    expect(screen.queryByText("₹200.00")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Save remuneration" }));
    await waitFor(() =>
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        userId: "user-1",
        amountPerDay: 200,
        effectiveFrom: "2020-02-01",
      }),
    );
  });

  it("shows inline precision errors and recovers from a rejected save", async () => {
    mocks.mutateAsync.mockRejectedValueOnce(new Error("offline"));
    renderPage();
    const rateInputs = await screen.findAllByLabelText("Daily remuneration for Asha");

    fireEvent.change(rateInputs[0], { target: { value: "10.005" } });
    expect(
      screen.getAllByText("Use no more than 2 decimal places.").length,
    ).toBeGreaterThan(0);
    expect(rateInputs[0].getAttribute("aria-invalid")).toBe("true");
    expect(
      (screen.getByRole("button", { name: "Save remuneration" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    fireEvent.change(rateInputs[0], { target: { value: "200" } });
    fireEvent.click(screen.getByRole("button", { name: "Save remuneration" }));
    const saveFailure = await screen.findByText("Remuneration was not saved");
    expect(saveFailure.closest('[role="alert"]')?.textContent).toContain(
      "Remuneration was not saved",
    );
    expect(
      screen.getByRole("button", { name: "Try saving again" }),
    ).toBeTruthy();
  });

  it("filters payees by readiness and search", async () => {
    renderPage();
    await screen.findAllByText("Asha");

    fireEvent.change(screen.getByLabelText("Payment readiness"), {
      target: { value: "NEEDS_RATE" },
    });
    expect(screen.queryByText("Asha")).toBeNull();
    expect(screen.getAllByText("Dev").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText("Search people"), {
      target: { value: "Asha" },
    });
    expect(screen.getByText("No matching attendance")).toBeTruthy();
  });

  it("blocks the ledger and monetary summaries when a required query fails", () => {
    const refetchAttendance = vi.fn();
    const refetchSemester = vi.fn();
    const refetchPayees = vi.fn();
    mocks.semesterQuery = {
      ...mocks.semesterQuery,
      refetch: refetchSemester,
    };
    mocks.attendanceQuery = {
      data: undefined,
      isLoading: false,
      error: new Error("offline"),
      refetch: refetchAttendance,
    };
    mocks.payeesQuery = {
      ...mocks.payeesQuery,
      refetch: refetchPayees,
    };
    renderPage();

    expect(screen.getByRole("alert").textContent).toContain(
      "We could not load the remuneration ledger",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.queryByLabelText("Remuneration month")).toBeNull();
    expect(screen.queryByText("Expected payment")).toBeNull();
    expect(screen.queryByText(/₹/)).toBeNull();
    expect(screen.queryByText("Asha")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetchAttendance).toHaveBeenCalledOnce();
    expect(refetchSemester).toHaveBeenCalledOnce();
    expect(refetchPayees).toHaveBeenCalledOnce();
  });

  it("shows only loading content while a required query is loading", () => {
    mocks.payeesQuery = {
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    };
    renderPage();

    expect(screen.getByText("Loading remuneration")).toBeTruthy();
    expect(screen.queryByLabelText("Remuneration month")).toBeNull();
    expect(screen.queryByText("Asha")).toBeNull();
  });
});
