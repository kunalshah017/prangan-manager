import { PrismaClient } from "../generated/prisma/index.js";
import type { User } from "../generated/prisma/index.js";
import { UserStatus, Level, Role } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

export const createUser = async (
  userData: Omit<User, "id" | "createdAt" | "updatedAt">
) => {
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
        profileImageUrl: true,
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

export const updateUser = async (
  id: string,
  status: UserStatus,
  role: Role,
  password: string
) => {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        status: status,
        role: role,
        password: password,
      },
    });
    return user;
  } catch (error: unknown) {
    console.error("Error updating user:", error);
    return "Failed to update user";
  }
};

export const getUnverifiedUsers = async () => {
  try {
    const users = await prisma.user.findMany({
      where: { status: UserStatus.PENDING },
      select: {
        id: true,
        email: true,
        name: true,
        profileImageUrl: true,
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
};

// Student service functions
export const createStudent = async (studentData: any) => {
  try {
    const student = await prisma.students.create({
      data: studentData,
    });
    return student;
  } catch (error: unknown) {
    console.error("Error creating student:", error);
    return "Failed to create student";
  }
};

export const getAllStudents = async () => {
  try {
    const students = await prisma.students.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return students;
  } catch (error: unknown) {
    console.error("Error fetching students:", error);
    return "Failed to fetch students";
  }
};

export const getStudentById = async (id: string) => {
  try {
    const student = await prisma.students.findUnique({
      where: { id },
    });
    return student;
  } catch (error: unknown) {
    console.error("Error fetching student by ID:", error);
    return "Failed to fetch student";
  }
};

export const updateStudent = async (id: string, studentData: any) => {
  try {
    const { id: _, createdAt, updatedAt, ...updateData } = studentData;
    const student = await prisma.students.update({
      where: { id },
      data: updateData,
    });
    return student;
  } catch (error: unknown) {
    console.error("Error updating student:", error);
    return "Failed to update student";
  }
};

export const deleteStudent = async (id: string) => {
  try {
    await prisma.students.delete({
      where: { id },
    });
    return true;
  } catch (error: unknown) {
    console.error("Error deleting student:", error);
    return "Failed to delete student";
  }
};

export const getStudentsByLevel = async (level: Level) => {
  try {
    const students = await prisma.students.findMany({
      where: { level },
      orderBy: {
        name: "asc",
      },
    });
    return students;
  } catch (error: unknown) {
    console.error("Error fetching students by level:", error);
    return "Failed to fetch students by level";
  }
};
