import assert from "node:assert/strict";
import test from "node:test";
import bcryptjs from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import Fastify from "fastify";

import {
  registerUser,
  requestPasswordReset,
  updateUserController,
} from "../../controllers/user.controller.js";
import { buildPasswordResetEmailJob } from "../../email/account-email.js";
import { Role, UserStatus } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import { userRoutes } from "../../routes/user.route.js";
import {
  completeEmailJob,
  failEmailJob,
} from "../../service/email-queue.service.js";

const createReply = () => {
  const response = { statusCode: 0, payload: undefined as unknown };
  const reply = {
    status(code: number) {
      response.statusCode = code;
      return this;
    },
    send(value: unknown) {
      response.payload = value;
      return this;
    },
  };
  return { reply: reply as never, response };
};

const stub = <T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: unknown,
) => {
  const original = target[key];
  target[key] = value as T[K];
  return () => {
    target[key] = original;
  };
};

const registration = {
  firstName: "Asha",
  middleName: "Kumar",
  lastName: "Shah",
  email: "asha@example.com",
};

test("a new registration does not get a password anyone knows", async () => {
  let created: { password: string } | undefined;
  const restore = [
    stub(prisma.user, "findUnique", async () => null),
    stub(prisma.user, "count", async () => 0),
    stub(prisma.user, "create", async ({ data }: { data: { password: string } }) => {
      created = data;
      return { id: "user-1", ...data };
    }),
  ];
  try {
    const { reply, response } = createReply();
    await registerUser({ body: { ...registration } } as never, reply);

    assert.equal(response.statusCode, 201);
    assert.ok(created);
    assert.equal(
      await bcryptjs.compare("pending-account-password", created.password),
      false,
    );
  } finally {
    restore.forEach((undo) => undo());
  }
});

test("registration refuses an email field holding several addresses", async () => {
  const { reply, response } = createReply();
  await registerUser(
    { body: { ...registration, email: "a@one.org,b@two.org" } } as never,
    reply,
  );

  assert.equal(response.statusCode, 400);
});

test("registration caps its text and takes the photo itself, never a link", async () => {
  const register = async (body: Record<string, unknown>) => {
    const { reply, response } = createReply();
    await registerUser({ body: { ...registration, ...body } } as never, reply);
    return response;
  };

  const longAddress = await register({ address: "x".repeat(501) });
  assert.equal(longAddress.statusCode, 400);
  assert.deepEqual(longAddress.payload, {
    message: "Address can be at most 500 characters.",
  });
  assert.equal((await register({ phone: { $gt: "" } })).statusCode, 400);
  assert.equal(
    (await register({ profileImageUrl: "https://evil.example/tracker.png" })).statusCode,
    400,
  );
  assert.equal(
    (await register({ profileImageUrl: "data:image/svg+xml;base64,PHN2Zz4=" })).statusCode,
    400,
  );
});

test("sign-ups share one hourly allowance and nothing is uploaded past it", async () => {
  let uploads = 0;
  const restore = [
    stub(prisma.user, "findUnique", async () => null),
    stub(prisma.user, "count", async () => 20),
    stub(cloudinary.uploader, "upload", async () => {
      uploads += 1;
    }),
  ];
  try {
    const { reply, response } = createReply();
    await registerUser(
      { body: { ...registration, profileImageUrl: "data:image/jpeg;base64,/9j/4AAQ" } } as never,
      reply,
    );

    assert.equal(response.statusCode, 429);
    assert.equal(uploads, 0);
  } finally {
    restore.forEach((undo) => undo());
  }
});

test("the server uploads the sign-up photo, shrunk, and stores its link", async () => {
  const env = { ...process.env };
  Object.assign(process.env, {
    CLOUDINARY_CLOUD_NAME: "demo",
    CLOUDINARY_API_KEY: "key-1",
    CLOUDINARY_API_SECRET: "secret-1",
  });
  let uploadOptions: Record<string, unknown> | undefined;
  let created: { profileImageUrl: string | null } | undefined;
  const storedUrl =
    "https://res.cloudinary.com/demo/image/upload/v1/prangan-manager/registrations/abc.jpg";
  const restore = [
    stub(prisma.user, "findUnique", async () => null),
    stub(prisma.user, "count", async () => 19),
    stub(cloudinary.uploader, "upload", async (_file: string, options: Record<string, unknown>) => {
      uploadOptions = options;
      return { secure_url: storedUrl };
    }),
    stub(prisma.user, "create", async ({ data }: { data: { profileImageUrl: string | null } }) => {
      created = data;
      return { id: "user-1", name: "Asha Kumar Shah", ...data };
    }),
  ];
  try {
    const { reply, response } = createReply();
    await registerUser(
      { body: { ...registration, profileImageUrl: "data:image/jpeg;base64,/9j/4AAQ" } } as never,
      reply,
    );

    assert.equal(response.statusCode, 201);
    assert.equal(created?.profileImageUrl, storedUrl);
    assert.equal(uploadOptions?.folder, "prangan-manager/registrations");
    assert.deepEqual(uploadOptions?.transformation, [
      { width: 1200, height: 1200, crop: "limit", quality: 80 },
    ]);
  } finally {
    restore.forEach((undo) => undo());
    process.env = env;
  }
});

test("people cannot change their own email address", async () => {
  const { reply, response } = createReply();
  await updateUserController(
    {
      user: { id: "user-1", name: "Asha", email: "asha@example.com", role: Role.USER },
      params: { userId: "user-1" },
      body: { email: "attacker@example.com" },
    } as never,
    reply,
  );

  assert.equal(response.statusCode, 403);
});

test("account emails escape the person's name", () => {
  const job = buildPasswordResetEmailJob({
    accountTokenId: "token-1",
    email: "asha@example.com",
    name: '<a href="https://evil.example">Asha</a>',
    resetUrl: "https://manager.example/reset-password?token=abc",
  });

  assert.match(job.html, /&lt;a href=&quot;https:\/\/evil\.example&quot;&gt;/);
  assert.doesNotMatch(job.html, /<a href="https:\/\/evil\.example">/);
});

test("login attempts are limited per email address", async () => {
  const restore = stub(prisma.user, "findUnique", async () => null);
  const app = Fastify();
  await app.register(userRoutes, { prefix: "/api/v1" });
  try {
    const login = (email: string) =>
      app.inject({
        method: "POST",
        url: "/api/v1/users/login",
        payload: { email, password: "guess" },
      });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      assert.equal((await login("admin@example.com")).statusCode, 401);
    }
    assert.equal((await login(" Admin@Example.com ")).statusCode, 429);
    assert.equal((await login("someone@example.com")).statusCode, 401);
  } finally {
    restore();
    await app.close();
  }
});

test("a repeated reset request does not replace a link sent minutes ago", async () => {
  let transactions = 0;
  let recentLink: { id: string } | null = { id: "token-1" };
  const restore = [
    stub(prisma.user, "findUnique", async () => ({
      id: "user-1",
      name: "Asha",
      email: "asha@example.com",
      status: UserStatus.APPROVED,
    })),
    stub(prisma.accountToken, "findFirst", async () => recentLink),
    stub(prisma, "$transaction", async () => {
      transactions += 1;
    }),
  ];
  try {
    const request = { body: { email: "asha@example.com" } } as never;
    await requestPasswordReset(request, createReply().reply);
    assert.equal(transactions, 0);

    recentLink = null;
    await requestPasswordReset(request, createReply().reply);
    assert.equal(transactions, 1);
  } finally {
    restore.forEach((undo) => undo());
  }
});

test("finished email jobs no longer keep the message body", async () => {
  const updates: Record<string, unknown>[] = [];
  const restore = stub(
    prisma.emailJob,
    "updateMany",
    async ({ data }: { data: Record<string, unknown> }) => {
      updates.push(data);
      return { count: 1 };
    },
  );
  try {
    const job = { id: "job-1", lockToken: "lock-1", attempts: 1, maxAttempts: 5 };
    await completeEmailJob(job);
    await failEmailJob(job, new Error("retry later"));
    await failEmailJob({ ...job, attempts: 5 }, new Error("gave up"));

    assert.equal(updates[0]?.html, "");
    assert.equal(updates[0]?.text, null);
    assert.equal("html" in updates[1]!, false);
    assert.equal(updates[2]?.html, "");
  } finally {
    restore();
  }
});
