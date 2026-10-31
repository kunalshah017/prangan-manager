import bcryptjs from "bcryptjs";
import { pathToFileURL } from "node:url";

import { createRawAccountToken } from "../security/account-token.js";

// Gives a random, unknown password to every account whose password is public:
// the old registration placeholder, the old seed and temp passwords, and the
// generated passwords sent before release 2.1.0. They sign in again through
// "Forgot password". Dry run unless --apply is passed.

// Literal passwords that were committed to the public repository.
export const PUBLISHED_PASSWORDS = [
  "pending-account-password",
  "Prangan@2025",
  "AdminTest123!",
  "defaultPassword123",
];

// Accounts approved before release 2.1.0 got a generated password by email.
export const GENERATED_PASSWORD_CUTOFF = new Date("2026-07-25T00:00:00.000Z");

type Token = { type: string; usedAt: Date | null; createdAt: Date };

// Issuing a new link also stamps usedAt on the older one it replaces, so a
// usedAt only counts when no newer link of that type was created at that moment.
export const setOwnPassword = (tokens: Token[]): boolean =>
  tokens.some(
    (token) =>
      token.usedAt !== null &&
      !tokens.some(
        (newer) =>
          newer !== token &&
          newer.type === token.type &&
          Math.abs(newer.createdAt.getTime() - token.usedAt!.getTime()) < 60_000,
      ),
  );

export const parseArgs = (args: string[]): { apply: boolean } => {
  let apply = false;
  for (const argument of args) {
    if (argument === "--apply") apply = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return { apply };
};

export const runResetUnsetPasswords = async (
  options: { apply: boolean },
  prisma: any,
) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      status: true,
      password: true,
      createdAt: true,
      accountTokens: { select: { type: true, usedAt: true, createdAt: true } },
    },
  });

  const candidates: { id: string; email: string; status: string; reason: string }[] = [];
  for (const user of users) {
    let reason: string | undefined;
    if (
      user.status === "APPROVED" &&
      user.createdAt < GENERATED_PASSWORD_CUTOFF &&
      !setOwnPassword(user.accountTokens)
    ) {
      reason = "generated password from before 2.1.0";
    } else {
      for (const password of PUBLISHED_PASSWORDS) {
        if (await bcryptjs.compare(password, user.password)) {
          reason = "published password";
          break;
        }
      }
    }
    if (reason) {
      candidates.push({ id: user.id, email: user.email, status: user.status, reason });
    }
  }

  if (options.apply && candidates.length > 0) {
    await prisma.$transaction(
      await Promise.all(
        candidates.map(async (candidate) =>
          prisma.user.update({
            where: { id: candidate.id },
            data: {
              password: await bcryptjs.hash(createRawAccountToken(), 10),
              // Ends any session opened with the old password.
              sessionVersion: { increment: 1 },
            },
          }),
        ),
      ),
    );
  }

  return {
    mode: options.apply ? "apply" : "dry-run",
    users: users.length,
    toReset: candidates.length,
    accounts: candidates.map(({ email, status, reason }) => ({ email, status, reason })),
  };
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const { prisma } = await import("../lib/prisma.js");
  try {
    console.log(JSON.stringify(await runResetUnsetPasswords(options, prisma), null, 2));
  } finally {
    await prisma.$disconnect();
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
