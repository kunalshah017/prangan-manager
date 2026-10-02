// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";

import { api } from "@/lib/api-client";
import CreateExam from "@/pages/exams/CreateExam";

vi.mock("@/hooks", async () => ({
  useCreateExam: (await import("@/hooks/useExamQueries")).useCreateExam,
  useSemester: () => ({
    data: { id: "semester-1", name: "Semester 1", centerId: "center-1", status: "ACTIVE", startDate: "2026-04-01T00:00:00.000Z", endDate: "2026-04-30T23:59:59.999Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    isLoading: false,
    isError: false,
  }),
}));
vi.mock("@/hooks/useAcademicLevelQueries", () => ({
  useSemesterLevels: () => ({
    data: [{ id: "level-1", semesterId: "semester-1", academicLevelId: "academic-1", isActive: true, academicLevel: { id: "academic-1", code: "LEVEL_1", name: "Level 1", journeyOrder: 1, isActive: true } }],
    isSuccess: true,
    isLoading: false,
    error: null,
  }),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "ADMIN" } }) }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("submits only supported create fields after selecting an exam date", async () => {
  const post = vi.spyOn(api, "post").mockResolvedValue({ data: { id: "exam-1" } });
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/projects/project-1/centers/center-1/semesters/semester-1/exams/create"]}><Routes>
    <Route path="/projects/:projectId/centers/:centerId/semesters/:semesterId/exams/create" element={<CreateExam />} />
    <Route path="/projects/:projectId/centers/:centerId/semesters/:semesterId/dashboard/exams" element={<p>Exam list</p>} />
  </Routes></MemoryRouter></QueryClientProvider>);

  fireEvent.change(screen.getByLabelText(/Level/), { target: { value: "level-1" } });
  fireEvent.click(screen.getByRole("button", { name: "Exam date" }));
  fireEvent.click(screen.getByRole("button", { name: /Saturday, April 4th/ }));
  fireEvent.click(screen.getByRole("button", { name: "Create exam" }));

  await waitFor(() => expect(post).toHaveBeenCalledWith("/exams", {
    projectId: "project-1", centerId: "center-1", semesterId: "semester-1",
    semesterLevelId: "level-1", cycle: "SA_1", name: "Level 1 | SA-1 | Semester 1",
    description: "", examDate: "2026-04-04",
    listeningMaxMarks: 5, speakingMaxMarks: 5, readingMaxMarks: 5, writingMaxMarks: 35,
  }));
  await waitFor(() => expect(screen.getByText("Exam list")).toBeTruthy());
  client.clear();
});
