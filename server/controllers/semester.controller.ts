import type { FastifyRequest, FastifyReply } from "fastify";
import { asyncHandle, successHandle, errorHandle } from "../utils/handler.js";
import type { semester } from "../types/semester.type.js";
import { CreateSemester } from "../service/semester.service.js";

export const createSemester = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {

    const user = request.user; // Assuming user is set by authChecker middleware
    if (!user || user.role !== "ADMIN") {
        return errorHandle("Unauthorized: Admin access required.", reply, 403);
    }

    const data: Partial<semester> = request.body as Partial<semester>;

    if (!data.name || !data.startDate || !data.endDate || !data.centerId) {
        return errorHandle("Name, start date, end date, and center ID are required.", reply, 400);
    }

    // Assuming you have a service function to create a semester
    const semester = await CreateSemester(data);

    if (typeof semester === "string") {
        return errorHandle(semester, reply, 500);
    }

    return successHandle({ message: "Semester created successfully", semester }, reply, 201);
});