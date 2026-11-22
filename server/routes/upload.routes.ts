import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { v2 as cloudinary } from "cloudinary";

import { cloudinaryCredentials } from "../lib/cloudinary.js";
import { authChecker } from "../utils/authChecker.js";
import { errorHandle } from "../utils/handler.js";

// Signed-in people upload straight to Cloudinary, but only with a signature from
// here, so the account accepts no anonymous (unsigned) uploads. Sign-up photos
// go through the server instead (registerUser).
const signImageUpload =
  (folder: string) => async (_request: FastifyRequest, reply: FastifyReply) => {
    const credentials = cloudinaryCredentials();
    if (!credentials) {
      return errorHandle("Image upload isn't available right now.", reply, 503);
    }

    const params = {
      allowed_formats: "jpg,png,gif,webp",
      folder,
      timestamp: Math.floor(Date.now() / 1000),
    };
    return {
      cloudName: credentials.cloud_name,
      apiKey: credentials.api_key,
      ...params,
      signature: cloudinary.utils.api_sign_request(params, credentials.api_secret),
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
};
