import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type {
  ExpenseListResponse,
  ExpenseStatus,
  RemunerationPaymentResponse,
} from "@/types/api";

export type ExpenseFilters = {
  projectId: string;
  centerId: string;
  semesterId: string;
  month?: string;
  expenseType?: string;
  category?: string;
  status?: ExpenseStatus;
  search?: string;
  enabled?: boolean;
};

const expenseParams = (params: ExpenseFilters) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (key !== "enabled" && value) search.set(key, String(value));
  });
  return search;
};

export const useExpenses = (params: ExpenseFilters) =>
  useQuery({
    queryKey: ["expenses", params],
    queryFn: async () => {
      const response = await api.get<ExpenseListResponse>(
        `/expenses?${expenseParams(params).toString()}`,
      );
      return response;
    },
    enabled:
      params.enabled !== false &&
      Boolean(params.projectId && params.centerId && params.semesterId),
  });

export type ManualExpenseInput = {
  projectId: string;
  centerId: string;
  semesterId: string;
  title: string;
  category: string;
  amount: number;
  incurredOn: string;
  notes?: string;
};

const useExpenseInvalidation = () => {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: ["expenses"],
    });
};

export const useCreateManualExpense = () => {
  const invalidate = useExpenseInvalidation();
  return useMutation({
    mutationFn: (input: ManualExpenseInput) =>
      api.post("/expenses/manual", input),
    onSuccess: invalidate,
  });
};

export const useVoidExpense = () => {
  const invalidate = useExpenseInvalidation();
  return useMutation({
    mutationFn: ({
      expenseId,
      voidReason,
    }: {
      expenseId: string;
      voidReason: string;
    }) => api.post(`/expenses/${expenseId}/void`, { voidReason }),
    onSuccess: invalidate,
  });
};

export const useMarkRemunerationPaid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      projectId: string;
      centerId: string;
      semesterId: string;
      month: string;
      userIds: string[];
    }) =>
      api.post<RemunerationPaymentResponse>(
        "/expenses/remuneration-payments",
        input,
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["remuneration-users"] }),
      ]);
    },
  });
};
