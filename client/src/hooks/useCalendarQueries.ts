import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  CalendarEvent,
  CreateCalendarEventRequest,
  UpdateCalendarEventRequest,
} from "@/types/calendar";

export const useCalendarEvents = (filters: {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ["calendar-events", filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.projectId) params.append("projectId", filters.projectId);
      if (filters.centerId) params.append("centerId", filters.centerId);
      if (filters.semesterId) params.append("semesterId", filters.semesterId);

      const response = await api.get<{
        data: CalendarEvent[];
        count: number;
      }>(`/calendar-events?${params.toString()}`);

      return response.data;
    },
    enabled:
      filters.enabled ??
      (!!filters.projectId && !!filters.centerId && !!filters.semesterId),
  });
};

export const useCreateCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCalendarEventRequest) => {
      const response = await api.post<{
        message: string;
        data: CalendarEvent;
      }>("/calendar-events", data);

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
};

export const useUpdateCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      data,
    }: {
      eventId: string;
      data: UpdateCalendarEventRequest;
    }) => {
      const response = await api.put<{
        message: string;
        data: CalendarEvent;
      }>(`/calendar-events/${eventId}`, data);

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
};

export const useDeleteCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      await api.delete<{ message: string }>(
        `/calendar-events/${eventId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
};
