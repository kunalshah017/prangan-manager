import { AwsClient } from "aws4fetch";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { authChecker } from "../utils/authChecker.js";
import { errorHandle } from "../utils/handler.js";

// Coursebook PDFs live in a private Cloudflare R2 bucket at books/<bookId>.pdf.
// Only the server holds the bucket key; signed-in readers get a link that stops
// working after an hour.
const LINK_LIFETIME_SECONDS = 60 * 60;

export const bookPathname = (bookId: string): string | undefined =>
  /^[a-z0-9-]{1,100}$/.test(bookId) ? `books/${bookId}.pdf` : undefined;

// Signing is local (no call to Cloudflare); undefined when the bucket isn't configured.
export const signBookUrl = async (
  pathname: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string | undefined> => {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return undefined;
  const url = new URL(`https://${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${pathname}`);
  url.searchParams.set("X-Amz-Expires", String(LINK_LIFETIME_SECONDS));
  const client = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
  const signed = await client.sign(url.toString(), { aws: { signQuery: true } });
  return signed.url;
};

export const libraryRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    "/library/books/:bookId/pdf-url",
    { preHandler: authChecker },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookId } = request.params as { bookId: string };
      const pathname = bookPathname(bookId);
      if (!pathname) return errorHandle("Book not found.", reply, 404);
      const url = await signBookUrl(pathname);
      if (!url) return errorHandle("The library isn't available right now.", reply, 503);
      return { url };
    },
  );
};
