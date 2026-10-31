import assert from "node:assert/strict";
import test from "node:test";
import cookie from "@fastify/cookie";
import Fastify from "fastify";

import { bookPathname, libraryRoutes } from "../../routes/library.routes.js";

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
