import { PrismaClient } from "../generated/prisma/index.js";
import type { semester } from "../types/semester.type.js";

const prisma = new PrismaClient();

export const CreateSemester = async (semesterData: Partial<semester>) => {
    try {
        const semester = await prisma.semesters.create({
            data: semesterData as any,
        });
        return semester;
    } catch (error: unknown) {
        console.error("Error creating semester:", error);
        return "Failed to create semester";
    }
}