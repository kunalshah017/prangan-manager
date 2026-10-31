import { issueSignedToken, presignUrl, type IssuedSignedToken } from "@vercel/blob";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { authChecker } from "../utils/authChecker.js";
import { errorHandle } from "../utils/handler.js";

// Coursebook PDFs live in a private Vercel Blob store at books/<bookId>.pdf.
// Only the server holds the store key (BLOB_READ_WRITE_TOKEN); signed-in readers
// get a link that stops working after an hour.
const LINK_LIFETIME_MS = 60 * 60 * 1000;
const SIGNING_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

export const bookPathname = (bookId: string): string | undefined =>
  /^[a-z0-9-]{1,100}$/.test(bookId) ? `books/${bookId}.pdf` : undefined;

let signingToken: IssuedSignedToken | undefined;

// One read-only token signs every link until less than a link lifetime is left,
// so most requests make no call to Vercel.
const getSigningToken = async (): Promise<IssuedSignedToken> => {
  if (!signingToken || signingToken.validUntil - Date.now() < LINK_LIFETIME_MS) {
    signingToken = await issueSignedToken({
      operations: ["get"],
      validUntil: Date.now() + SIGNING_TOKEN_LIFETIME_MS,
    });
  }
  return signingToken;
};

export const libraryRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    "/library/books/:bookId/pdf-url",
    { preHandler: authChecker },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookId } = request.params as { bookId: string };
      const pathname = bookPathname(bookId);
      if (!pathname) return errorHandle("Book not found.", reply, 404);
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return errorHandle("The library isn't available right now.", reply, 503);
      }
      const { presignedUrl } = await presignUrl(await getSigningToken(), {
        operation: "get",
        pathname,
        access: "private",
        validUntil: Date.now() + LINK_LIFETIME_MS,
      });
      return { url: presignedUrl };
    },
  );
};
