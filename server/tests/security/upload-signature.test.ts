import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import cookie from "@fastify/cookie";
import Fastify from "fastify";

import { uploadRoutes } from "../../routes/upload.routes.js";

const withCloudinaryEnv = async (run: () => Promise<void>) => {
  const original = { ...process.env };
  Object.assign(process.env, {
    CLOUDINARY_CLOUD_NAME: "demo",
    CLOUDINARY_API_KEY: "key-1",
    CLOUDINARY_API_SECRET: "secret-1",
  });
  try {
    await run();
  } finally {
    process.env = original;
  }
};

test("registration uploads get a valid signature and share a small hourly limit", async () => {
  await withCloudinaryEnv(async () => {
    const app = Fastify();
    await app.register(uploadRoutes, { prefix: "/api/v1" });
    try {
      const sign = () =>
        app.inject({ url: "/api/v1/uploads/registration-image-signature" });

      const first = await sign();
      assert.equal(first.statusCode, 200);
      const body = first.json();
      // Cloudinary's rule: sorted params joined with &, then the secret, SHA-1.
      const expected = createHash("sha1")
        .update(
          `allowed_formats=${body.allowed_formats}&folder=${body.folder}&timestamp=${body.timestamp}secret-1`,
        )
        .digest("hex");
      assert.equal(body.signature, expected);
      assert.equal(body.folder, "prangan-manager/registrations");
      assert.equal("apiSecret" in body, false);

      for (let request = 1; request < 20; request += 1) {
        assert.equal((await sign()).statusCode, 200);
      }
      assert.equal((await sign()).statusCode, 429);
    } finally {
      await app.close();
    }
  });
});

test("signed-in uploads need a session", async () => {
  await withCloudinaryEnv(async () => {
    const app = Fastify();
    await app.register(cookie);
    await app.register(uploadRoutes, { prefix: "/api/v1" });
    try {
      const response = await app.inject({ url: "/api/v1/uploads/image-signature" });
      assert.equal(response.statusCode, 401);
    } finally {
      await app.close();
    }
  });
});
