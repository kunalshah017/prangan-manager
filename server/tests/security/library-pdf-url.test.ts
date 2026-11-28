import assert from "node:assert/strict";
import test from "node:test";
import cookie from "@fastify/cookie";
import Fastify from "fastify";

import { bookPathname, libraryRoutes, signBookUrl } from "../../routes/library.routes.js";

test("book links need a session", async () => {
  const app = Fastify();
  await app.register(cookie);
  await app.register(libraryRoutes, { prefix: "/api/v1" });
  try {
    const response = await app.inject({ url: "/api/v1/library/books/book-1/pdf-url" });
    assert.equal(response.statusCode, 401);
    assert.doesNotMatch(response.body, /blob\.vercel-storage/);
  } finally {
    await app.close();
  }
});

test("only plain book ids map to a file in the store", () => {
  assert.equal(bookPathname("grammar-gear-level-1"), "books/grammar-gear-level-1.pdf");
  for (const bookId of ["", "../secret", "books/x", "Book-1", "a.pdf", "x".repeat(101)]) {
    assert.equal(bookPathname(bookId), undefined, bookId);
  }
});

test("book links are signed for an hour without exposing the key", async () => {
  const env = {
    R2_ACCOUNT_ID: "acct123",
    R2_ACCESS_KEY_ID: "AKIDEXAMPLE",
    R2_SECRET_ACCESS_KEY: "secret-never-in-links",
    R2_BUCKET: "prangan-books",
  };
  const url = new URL((await signBookUrl("books/grammar-gear-level-1.pdf", env))!);
  assert.equal(url.origin, "https://prangan-books.acct123.r2.cloudflarestorage.com");
  assert.equal(url.pathname, "/books/grammar-gear-level-1.pdf");
  assert.equal(url.searchParams.get("X-Amz-Expires"), "3600");
  assert.match(url.searchParams.get("X-Amz-Signature") ?? "", /^[0-9a-f]{64}$/);
  assert.doesNotMatch(url.href, /secret-never-in-links/);

  assert.equal(await signBookUrl("books/x.pdf", { ...env, R2_SECRET_ACCESS_KEY: "" }), undefined);
});
