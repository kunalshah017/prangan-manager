import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";

import { unhandledErrorHandler } from "../../utils/handler.js";

test("unhandled server errors reach the browser without their message", async () => {
  const app = Fastify();
  app.setErrorHandler(unhandledErrorHandler);
  app.get("/database", async () => {
    throw new Error("Can't reach database server at ep-secret-host.neon.tech:5432");
  });
  app.get("/refused", async () => {
    throw Object.assign(new Error("Rate limit exceeded, retry in 1 hour"), { statusCode: 429 });
  });
  const logged = console.error;
  console.error = () => {};
  try {
    const failed = await app.inject({ url: "/database" });
    assert.equal(failed.statusCode, 500);
    assert.doesNotMatch(failed.body, /neon|database/i);

    const refused = await app.inject({ url: "/refused" });
    assert.equal(refused.statusCode, 429);
    assert.deepEqual(refused.json(), { message: "Rate limit exceeded, retry in 1 hour" });
  } finally {
    console.error = logged;
    await app.close();
  }
});
