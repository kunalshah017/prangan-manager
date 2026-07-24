import { createHash, randomBytes } from "node:crypto";

export const createRawAccountToken = (): string =>
  randomBytes(32).toString("base64url");

export const hashAccountToken = (rawToken: string): string =>
  createHash("sha256").update(rawToken).digest("hex");

export const isUsableAccountToken = (
  token: { expiresAt: Date; usedAt: Date | null },
  now = new Date(),
): boolean => token.usedAt === null && token.expiresAt > now;
