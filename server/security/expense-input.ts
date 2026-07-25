type ParseResult<T> = { data: T } | { error: string };

export type ExpenseStatusInput = "ACTIVE" | "VOIDED";

export type ExpenseScopeInput = {
  projectId: string;
  centerId: string;
  semesterId: string;
};

export type ExpenseListQuery = ExpenseScopeInput & {
  month?: string;
  expenseType?: string;
  category?: string;
  status?: ExpenseStatusInput;
  search?: string;
};

export type ManualExpenseInput = ExpenseScopeInput & {
  title: string;
  category: string;
  amount: number;
  incurredOn: string;
  notes?: string;
};

export type VoidExpenseInput = {
  voidReason: string;
};

export type RemunerationPaymentInput = ExpenseScopeInput & {
  month: string;
  userIds: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
) => Object.keys(value).every((key) => allowed.includes(key));

const trimmed = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const parseScope = (
  input: Record<string, unknown>,
): ParseResult<ExpenseScopeInput> => {
  const projectId = trimmed(input.projectId);
  const centerId = trimmed(input.centerId);
  const semesterId = trimmed(input.semesterId);
  if (!projectId || !centerId || !semesterId) {
    return { error: "Project, center, and semester are required." };
  }
  return { data: { projectId, centerId, semesterId } };
};

const isMonth = (value: string) => {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return year >= 1 && month >= 1 && month <= 12;
};

const isDateOnly = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    year >= 1 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export const parseExpenseListQuery = (
  input: unknown,
): ParseResult<ExpenseListQuery> => {
  if (!isRecord(input)) return { error: "Expense filters are invalid." };
  if (
    !hasOnlyKeys(input, [
      "projectId",
      "centerId",
      "semesterId",
      "month",
      "expenseType",
      "category",
      "status",
      "search",
    ])
  ) {
    return { error: "Expense filters contain unknown fields." };
  }
  const scope = parseScope(input);
  if ("error" in scope) return scope;

  const month = input.month === undefined ? undefined : trimmed(input.month);
  if (month !== undefined && (!month || !isMonth(month))) {
    return { error: "Month must use YYYY-MM format." };
  }
  const expenseType =
    input.expenseType === undefined ? undefined : trimmed(input.expenseType);
  const category =
    input.category === undefined ? undefined : trimmed(input.category);
  const search = input.search === undefined ? undefined : trimmed(input.search);
  if (
    expenseType === null ||
    category === null ||
    search === null ||
    (input.status !== undefined &&
      input.status !== "ACTIVE" &&
      input.status !== "VOIDED")
  ) {
    return { error: "Expense filters are invalid." };
  }

  return {
    data: {
      ...scope.data,
      ...(month && { month }),
      ...(expenseType && { expenseType }),
      ...(category && { category }),
      ...(input.status && { status: input.status as ExpenseStatusInput }),
      ...(search && { search }),
    },
  };
};

export const parseManualExpenseInput = (
  input: unknown,
): ParseResult<ManualExpenseInput> => {
  if (!isRecord(input)) return { error: "Manual expense data is invalid." };
  if (
    !hasOnlyKeys(input, [
      "projectId",
      "centerId",
      "semesterId",
      "title",
      "category",
      "amount",
      "incurredOn",
      "notes",
    ])
  ) {
    return { error: "Manual expense data contains unknown fields." };
  }
  const scope = parseScope(input);
  if ("error" in scope) return scope;
  const title = trimmed(input.title);
  const category = trimmed(input.category);
  const incurredOn = trimmed(input.incurredOn);
  if (!title || !category || !incurredOn || !isDateOnly(incurredOn)) {
    return { error: "Title, category, and a valid expense date are required." };
  }
  if (
    typeof input.amount !== "number" ||
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    input.amount >= 10_000_000_000 ||
    Number(input.amount.toFixed(2)) !== input.amount
  ) {
    return { error: "Amount must be a positive value with at most two decimals." };
  }
  const notes = input.notes === undefined ? undefined : trimmed(input.notes);
  if (notes === null) return { error: "Notes cannot be blank." };

  return {
    data: {
      ...scope.data,
      title,
      category,
      amount: input.amount,
      incurredOn,
      ...(notes && { notes }),
    },
  };
};

export const parseVoidExpenseInput = (
  input: unknown,
): ParseResult<VoidExpenseInput> => {
  if (!isRecord(input) || !hasOnlyKeys(input, ["voidReason"])) {
    return { error: "Void expense data is invalid." };
  }
  const voidReason = trimmed(input.voidReason);
  return voidReason
    ? { data: { voidReason } }
    : { error: "A void reason is required." };
};

export const parseRemunerationPaymentInput = (
  input: unknown,
): ParseResult<RemunerationPaymentInput> => {
  if (!isRecord(input)) return { error: "Payment data is invalid." };
  if (
    !hasOnlyKeys(input, [
      "projectId",
      "centerId",
      "semesterId",
      "month",
      "userIds",
    ])
  ) {
    return { error: "Payment data contains unknown fields." };
  }
  const scope = parseScope(input);
  if ("error" in scope) return scope;
  const month = trimmed(input.month);
  if (!month || !isMonth(month)) {
    return { error: "Month must use YYYY-MM format." };
  }
  if (!Array.isArray(input.userIds) || input.userIds.length === 0) {
    return { error: "At least one user is required." };
  }
  const userIds = input.userIds.map(trimmed);
  if (
    userIds.some((userId) => !userId) ||
    new Set(userIds).size !== userIds.length
  ) {
    return { error: "User IDs must be unique and nonempty." };
  }
  return {
    data: {
      ...scope.data,
      month,
      userIds: userIds as string[],
    },
  };
};
