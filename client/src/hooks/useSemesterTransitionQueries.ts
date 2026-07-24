import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { semesterSetupSummariesKey } from "@/lib/query-client";
import type {
  Semester,
  SemesterSetupSummariesResponse,
  SemesterTransition,
  StaffTransitionDecision,
  StudentTransitionDecision,
} from "@/types/api";

const setupKey = (semesterId: string) =>
  ["semesters", semesterId, "setup"] as const;

export const useSemesterSetupSummaries = (
  centerId: string,
  enabled = true,
) =>
  useQuery({
    queryKey: semesterSetupSummariesKey(centerId),
    queryFn: async () => {
      const response = await api.get<SemesterSetupSummariesResponse>(
        `/semesters/center/${centerId}/setup-summaries`,
      );
      return response.setupSummaries;
    },
    enabled: Boolean(centerId) && enabled,
  });

export const useSemesterTransition = (semesterId: string) =>
  useQuery({
    queryKey: setupKey(semesterId),
    queryFn: async () => {
      const response = await api.get<{ setup: SemesterTransition }>(
        `/semesters/${semesterId}/setup`,
      );
      return response.setup;
    },
    enabled: Boolean(semesterId),
  });

export const useSaveSemesterStudents = (semesterId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (students: StudentTransitionDecision[]) => {
      const response = await api.put<{ setup: SemesterTransition }>(
        `/semesters/${semesterId}/setup/students`,
        { students },
      );
      return response.setup;
    },
    onSuccess: (setup) => {
      queryClient.setQueryData(setupKey(semesterId), setup);
      void queryClient.invalidateQueries({
        queryKey: semesterSetupSummariesKey(setup.semester.centerId),
      });
    },
  });
};

export const useSaveSemesterStaff = (semesterId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (staff: StaffTransitionDecision[]) => {
      const response = await api.put<{ setup: SemesterTransition }>(
        `/semesters/${semesterId}/setup/staff`,
        { staff },
      );
      return response.setup;
    },
    onSuccess: (setup) => {
      queryClient.setQueryData(setupKey(semesterId), setup);
      void queryClient.invalidateQueries({
        queryKey: semesterSetupSummariesKey(setup.semester.centerId),
      });
    },
  });
};

export const useActivateSemester = (semesterId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{
        semester: Semester;
        queuedEmailCount: number;
      }>(
        `/semesters/${semesterId}/setup/activate`,
        {},
      );
      return {
        semester: response.semester,
        queuedEmailCount: response.queuedEmailCount,
      };
    },
    onSuccess: ({ semester }) => {
      queryClient.setQueryData(["semesters", semesterId], semester);
      queryClient.invalidateQueries({ queryKey: ["semesters"] });
      queryClient.invalidateQueries({ queryKey: setupKey(semesterId) });
      void queryClient.invalidateQueries({
        queryKey: semesterSetupSummariesKey(semester.centerId),
      });
    },
  });
};
