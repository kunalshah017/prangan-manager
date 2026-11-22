import assert from "node:assert/strict";
import test from "node:test";
import cookie from "@fastify/cookie";
import { v2 as cloudinary } from "cloudinary";
import Fastify from "fastify";

import { deleteRegistrationPhotoInBackground } from "../../lib/cloudinary.js";
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

test("anonymous callers get no upload signature", async () => {
  await withCloudinaryEnv(async () => {
    const app = Fastify();
    await app.register(uploadRoutes, { prefix: "/api/v1" });
    try {
      const response = await app.inject({
        url: "/api/v1/uploads/registration-image-signature",
      });
      assert.equal(response.statusCode, 404);
    } finally {
      await app.close();
    }
  });
});

test("a rejected sign-up's photo is deleted, and nothing outside sign-up photos", async () => {
  await withCloudinaryEnv(async () => {
    const deleted: string[] = [];
    const original = cloudinary.uploader.destroy;
    cloudinary.uploader.destroy = (async (publicId: string) => {
      deleted.push(publicId);
    }) as never;
    try {
      deleteRegistrationPhotoInBackground(
        "https://res.cloudinary.com/demo/image/upload/v1700/prangan-manager/registrations/abc123.jpg",
      );
      deleteRegistrationPhotoInBackground(
        "https://res.cloudinary.com/demo/image/upload/v1700/prangan-manager/student-photo.jpg",
      );
      deleteRegistrationPhotoInBackground(
        "https://res.cloudinary.com/other/image/upload/v1700/prangan-manager/registrations/abc123.jpg",
      );
      deleteRegistrationPhotoInBackground(null);
      assert.deepEqual(deleted, ["prangan-manager/registrations/abc123"]);
    } finally {
      cloudinary.uploader.destroy = original;
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
