import { PrismaClient } from "../generated/prisma/index.js";
import type { User } from "../types/user.types.js";

const prisma = new PrismaClient();

export const createUser = async (userData: User) => {
    try {
        const user = await prisma.user.create({
            data: userData,
        });
        return user;
    } catch (error: unknown) {
        console.error("Error creating user:", error);
        return "Failed to create user";
    }
}

export const getUserByEmail = async (email: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });
        return user;
    } catch (error: unknown) {
        console.error("Error fetching user by email:", error);
        return "Failed to fetch user";

    }
}