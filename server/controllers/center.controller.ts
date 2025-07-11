import type { FastifyRequest, FastifyReply } from "fastify";
import { asyncHandle, successHandle, errorHandle } from "../utils/handler.js";
import type { Center } from "../types/center.types.js";
import { CreateCenter, GetCenters } from "../service/center.service.js";

export const createCenter = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user; // Assuming user is set in the request by authentication middleware

    if (user?.role !== "ADMIN") {
        return errorHandle("Only admins can create centers.", reply, 403);
    }

    const data = request.body as Partial<Center>;

    if (!data.name) {
        return errorHandle("Center name is required.", reply, 400);
    }

    const center = await CreateCenter(data);

    if (typeof center === "string") {
        return errorHandle(center, reply, 500);
    }
    
    return successHandle({ message: "Center created successfully", center }, reply, 201);
});

export const listCenters = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const centers = await GetCenters();

    if (typeof centers === "string") {
        return errorHandle(centers, reply, 500);
    }

    return successHandle({ centers }, reply, 200);
});