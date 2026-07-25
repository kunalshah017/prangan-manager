import type { FastifyReply, FastifyRequest } from "fastify";
import { Role } from "../generated/prisma/index.js";
import {
  parseExpenseListQuery,
  parseManualExpenseInput,
  parseRemunerationPaymentInput,
  parseVoidExpenseInput,
} from "../security/expense-input.js";
import {
  createManualExpense,
  ExpenseServiceError,
  listExpenses,
  markRemunerationPaid,
  voidExpense,
} from "../service/expense.service.js";
import { asyncHandle, errorHandle, successHandle } from "../utils/handler.js";

const requireAdmin = (request: FastifyRequest, reply: FastifyReply) => {
  const administrator = request.user;
  if (!administrator || administrator.role !== Role.ADMIN) {
    errorHandle("Only administrators can manage expenses.", reply, 403);
    return null;
  }
  return administrator;
};

const handleExpenseError = (error: unknown, reply: FastifyReply) => {
  if (error instanceof ExpenseServiceError) {
    return errorHandle(error.message, reply, error.statusCode);
  }
  throw error;
};

export const listExpensesController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;
    const parsed = parseExpenseListQuery(request.query);
    if ("error" in parsed) return errorHandle(parsed.error, reply, 400);
    try {
      return successHandle(await listExpenses(parsed.data), reply, 200);
    } catch (error) {
      return handleExpenseError(error, reply);
    }
  },
);

export const createManualExpenseController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const administrator = requireAdmin(request, reply);
    if (!administrator) return;
    const parsed = parseManualExpenseInput(request.body);
    if ("error" in parsed) return errorHandle(parsed.error, reply, 400);
    try {
      const expense = await createManualExpense(
        parsed.data,
        administrator.id,
      );
      return successHandle(
        { message: "Manual expense created.", expense },
        reply,
        201,
      );
    } catch (error) {
      return handleExpenseError(error, reply);
    }
  },
);

export const voidExpenseController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const administrator = requireAdmin(request, reply);
    if (!administrator) return;
    const expenseId = (
      request.params as { expenseId?: unknown }
    ).expenseId;
    if (typeof expenseId !== "string" || !expenseId.trim()) {
      return errorHandle("Expense ID is required.", reply, 400);
    }
    const parsed = parseVoidExpenseInput(request.body);
    if ("error" in parsed) return errorHandle(parsed.error, reply, 400);
    try {
      const expense = await voidExpense(
        expenseId.trim(),
        parsed.data.voidReason,
        administrator.id,
      );
      return successHandle(
        { message: "Expense voided.", expense },
        reply,
        200,
      );
    } catch (error) {
      return handleExpenseError(error, reply);
    }
  },
);

export const markRemunerationPaidController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const administrator = requireAdmin(request, reply);
    if (!administrator) return;
    const parsed = parseRemunerationPaymentInput(request.body);
    if ("error" in parsed) return errorHandle(parsed.error, reply, 400);
    try {
      return successHandle(
        await markRemunerationPaid(parsed.data, administrator.id),
        reply,
        200,
      );
    } catch (error) {
      return handleExpenseError(error, reply);
    }
  },
);
