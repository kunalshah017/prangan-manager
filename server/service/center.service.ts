import { PrismaClient } from "../generated/prisma/index.js";

import type { Center } from "../types/center.types.js";

const prisma = new PrismaClient();


export const CreateCenter = async (centerData: Partial<Center>) => {
    try {
        const center = await prisma.centers.create({
            data: centerData as any,
        });
        return center;
    } catch (error: unknown) {
        console.error("Error creating center:", error);
        return "Failed to create center";
    }
};

export const GetCenters = async () => {
    try {
        const centers = await prisma.centers.findMany();
        return centers;
    } catch (error: unknown) {
        console.error("Error fetching centers:", error);
        return "Failed to fetch centers";
    }
}