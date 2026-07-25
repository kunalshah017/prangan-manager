import type { FastifyInstance } from "fastify";
import {
  createManualExpenseController,
  listExpensesController,
  markRemunerationPaidController,
  voidExpenseController,
} from "../controllers/expense.controller.js";
import { authChecker } from "../utils/authChecker.js";

export const expenseRoutes = async (fastify: FastifyInstance) => {
  fastify.get(
    "/expenses",
    { preHandler: authChecker },
    listExpensesController,
  );
  fastify.post(
    "/expenses/manual",
    { preHandler: authChecker },
    createManualExpenseController,
  );
  fastify.post(
    "/expenses/:expenseId/void",
    { preHandler: authChecker },
    voidExpenseController,
  );
  fastify.post(
    "/expenses/remuneration-payments",
    { preHandler: authChecker },
    markRemunerationPaidController,
  );
};
