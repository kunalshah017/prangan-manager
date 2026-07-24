import bcryptjs from "bcryptjs";
import { AccountTokenType, Prisma } from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import {
  createRawAccountToken,
  hashAccountToken,
  isUsableAccountToken,
} from "../security/account-token.js";

const ACCOUNT_TOKEN_LIFETIME_MS = 60 * 60 * 1000;

export const createAccountTokenInTransaction = async (
  transaction: Prisma.TransactionClient,
  userId: string,
  type: AccountTokenType,
): Promise<string> => {
  const rawToken = createRawAccountToken();

  await transaction.accountToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });
  await transaction.accountToken.create({
    data: {
      userId,
      type,
      tokenHash: hashAccountToken(rawToken),
      expiresAt: new Date(Date.now() + ACCOUNT_TOKEN_LIFETIME_MS),
    },
  });

  return rawToken;
};

export const createAccountToken = async (
  userId: string,
  type: AccountTokenType,
): Promise<string> =>
  prisma.$transaction((transaction) =>
    createAccountTokenInTransaction(transaction, userId, type),
  );

export const consumeAccountTokenAndSetPassword = async ({
  rawToken,
  type,
  password,
}: {
  rawToken: string;
  type: AccountTokenType;
  password: string;
}): Promise<boolean> =>
  prisma.$transaction(async (transaction) => {
    const token = await transaction.accountToken.findUnique({
      where: { tokenHash: hashAccountToken(rawToken) },
    });

    if (!token || token.type !== type || !isUsableAccountToken(token)) {
      return false;
    }

    const consumed = await transaction.accountToken.updateMany({
      where: { id: token.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) return false;

    await transaction.user.update({
      where: { id: token.userId },
      data: {
        password: await bcryptjs.hash(password, 10),
        sessionVersion: { increment: 1 },
      },
    });

    return true;
  });
