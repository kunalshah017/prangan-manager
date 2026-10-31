import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { v2 as cloudinary } from "cloudinary";

import { authChecker } from "../utils/authChecker.js";
import { errorHandle } from "../utils/handler.js";

// Browsers upload straight to Cloudinary, but only with a signature from here,
// so the account accepts no anonymous (unsigned) uploads.
const signImageUpload =
  (folder: string) => async (_request: FastifyRequest, reply: FastifyReply) => {
    const {
      CLOUDINARY_CLOUD_NAME: cloudName,
      CLOUDINARY_API_KEY: apiKey,
      CLOUDINARY_API_SECRET: apiSecret,
    } = process.env;
    if (!cloudName || !apiKey || !apiSecret) {
      return errorHandle("Image upload isn't available right now.", reply, 503);
    }

    const params = {
      allowed_formats: "jpg,png,gif,webp",
      folder,
      timestamp: Math.floor(Date.now() / 1000),
    };
    return {
      cloudName,
      apiKey,
      ...params,
      signature: cloudinary.utils.api_sign_request(params, apiSecret),
    };
  };

export const uploadRoutes = async (fastify: FastifyInstance): Promise<void> => {
  await fastify.register(rateLimit, { global: false, hook: "preHandler" });

  fastify.get(
    "/uploads/image-signature",
    {
      preHandler: authChecker,
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 hour",
          keyGenerator: (request: FastifyRequest) => request.user?.id ?? "",
        },
      },
    },
    signImageUpload("prangan-manager"),
  );

  // Registration happens before sign-in. Anonymous callers can't be told apart
  // behind the proxies, so they share one small hourly allowance.
  fastify.get(
    "/uploads/registration-image-signature",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 hour",
          keyGenerator: () => "registration",
        },
      },
    },
    signImageUpload("prangan-manager/registrations"),
  );
};
