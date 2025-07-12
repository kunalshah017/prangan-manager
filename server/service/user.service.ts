import { PrismaClient } from "../generated/prisma/index.js";
import type { User } from "../types/user.types.js";
import { UserStatus } from "../generated/prisma/index.js";
import { Role } from "../generated/prisma/index.js";

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
};

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
};

export const getUserById = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        phone: true,
        qualification: true,
        address: true,
        dob: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  } catch (error: unknown) {
    console.error("Error fetching user by ID:", error);
    return "Failed to fetch user";
  }
};

export const updateUser = async (id: string, status: UserStatus, role:Role, password:string) => {
  try {
    const user = await prisma.user.update({
      where: { id },
      data:{
        status: status,
        role: role,
        password: password,

      }
    });
    return user;
  } catch (error: unknown) {
    console.error("Error updating user:", error);
    return "Failed to update user";
  }
}

export const getUnverifiedUsers = async () => {
  try {
    const users = await prisma.user.findMany({
      where: { status: UserStatus.PENDING },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        qualification: true,
        address: true,
        dob: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return users;
  } catch (error: unknown) {
    console.error("Error fetching unverified users:", error);
    return "Failed to fetch unverified users";
  }
}