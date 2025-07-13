import type { FastifyRequest, FastifyReply } from "fastify";
import { asyncHandle, successHandle, errorHandle } from "../utils/handler.js";
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  getUnverifiedUsers,
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentsByLevel,
} from "../service/user.service.js";
import type { User } from "../types/user.types.js";
import { generToken } from "../utils/generateToken.js";
import bcryptjs from "bcryptjs";
import { sendEmail } from "../utils/mail.js";
import { UserStatus, Level } from "../generated/prisma/index.js";
import { Role } from "../generated/prisma/index.js";

export const registerUser = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const data: Partial<User> = request.body as Partial<User>;

    if (!data.email || !data.password || !data.name) {
      return errorHandle("Email, password, and name are required.", reply, 400);
    }

    const [checkUser, hashedPassword] = await Promise.all([
      getUserByEmail(data.email),
      bcryptjs.hash(data.password, 10),
    ]);

    if (checkUser) {
      return errorHandle("User already exists with this email.", reply, 400);
    }

    const userData = {
      name: data.name as string,
      email: data.email as string,
      password: hashedPassword,
      role: (data.role || "USER") as string,
      phone: data.phone || "",
      qualification: data.qualification || "",
      address: data.address || "",
      profileImageUrl: data.profileImageUrl || null,
    };

    const user = await createUser(userData as User);

    if (typeof user === "string") {
      return errorHandle(user, reply, 500);
    }
    return successHandle(
      { message: "User registered successfully" },
      reply,
      201
    );
  }
);

export const loginUser = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const data: Partial<User> = request.body as Partial<User>;

    if (!data.email || !data.password) {
      return errorHandle("Email and password are required.", reply, 400);
    }

    const user = await getUserByEmail(data.email);

    if (!user || typeof user === "string") {
      return errorHandle("User not found.", reply, 404);
    }

    const isPasswordValid = await bcryptjs.compare(
      data.password,
      user.password
    );

    if (!isPasswordValid) {
      return errorHandle("Invalid password.", reply, 401);
    }
    const token = generToken(user.id);
    return successHandle(
      {
        message: "Login successful",
        token: token,
      },
      reply,
      200
    );
  }
);

export const getCurrentUser = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (!user) {
      return errorHandle("User not found in request.", reply, 401);
    }

    const fullUserDetails = await getUserById(user.id);

    if (!fullUserDetails || typeof fullUserDetails === "string") {
      return errorHandle("User not found.", reply, 404);
    }

    return successHandle(
      {
        message: "User details retrieved successfully",
        user: fullUserDetails,
      },
      reply,
      200
    );
  }
);

export const verifyUser = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = request.user;
    if (!admin || admin.role !== "ADMIN") {
      return errorHandle("Unauthorized access.", reply, 403);
    }
    const data = request.body as {
      status: UserStatus;
      role: Role;
      userId: string;
      email: string;
      name: string;
    };
    console.log("Verifying user with data:", data);
    if (
      !data.userId ||
      !data.status ||
      !data.role ||
      !data.email ||
      !data.name
    ) {
      return errorHandle(
        "User ID, status, role, email, and name are required.",
        reply,
        400
      );
    }

    // Generate password: username + special symbol + 4 digit number
    const specialSymbols = ["@", "#", "$", "%", "&", "*", "!"];
    const randomSymbol =
      specialSymbols[Math.floor(Math.random() * specialSymbols.length)];
    const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4 digit number
    const generatedPassword = `${data.name}${randomSymbol}${randomNumber}`;

    // Hash the generated password
    const hashedPassword = await bcryptjs.hash(generatedPassword, 10);

    // Send email with the generated password
    const emailSubject = "Account Verification - Your New Password";
    const emailBody = `
      Dear ${data.name},
      
      Your account has been verified successfully. Here are your login credentials:
      
      Email: ${data.email}
      Password: ${generatedPassword}
      
      Best regards,
      Prangan Manager Team
    `;

    try {
      await sendEmail(data.email, emailSubject, emailBody);
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      return errorHandle("Failed to send verification email.", reply, 500);
    }

    // Update user with new status, role, and hashed password
    const updatedUser = await updateUser(
      data.userId,
      data.status,
      data.role,
      hashedPassword
    );
    if (typeof updatedUser === "string") {
      return errorHandle("Failed to update user status.", reply, 500);
    }

    return successHandle(
      {
        message: "User status updated successfully and password sent via email",
      },
      reply,
      200
    );
  }
);

export const GetUnverifiedUsers = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = request.user;
    if (!admin || admin.role !== "ADMIN") {
      return errorHandle("Unauthorized access.", reply, 403);
    }
    const unverifiedUsers = await getUnverifiedUsers();
    if (typeof unverifiedUsers === "string") {
      return errorHandle("Failed to fetch unverified users.", reply, 500);
    }
    return successHandle(
      {
        message: "Unverified users retrieved successfully",
        users: unverifiedUsers,
      },
      reply,
      200
    );
  }
);

// Student Controllers
export const addStudent = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user || user.role !== "ADMIN") {
      return errorHandle("Only admins can add students.", reply, 403);
    }

    const data = request.body as {
      name: string;
      dob?: string;
      phoneNumber?: string;
      whatsappNumber?: string;
      alternateNumber?: string;
      level: Level;
      profileImageUrl?: string;
    };

    if (!data.name || !data.level) {
      return errorHandle("Name and level are required.", reply, 400);
    }

    const studentData = {
      name: data.name,
      dob: data.dob ? new Date(data.dob) : null,
      phoneNumber: data.phoneNumber || null,
      whatsappNumber: data.whatsappNumber || null,
      alternateNumber: data.alternateNumber || null,
      level: data.level,
      profileImageUrl: data.profileImageUrl || null,
    };

    const student = await createStudent(studentData);

    if (typeof student === "string") {
      return errorHandle(student, reply, 500);
    }

    return successHandle(
      {
        message: "Student added successfully",
        student: student,
      },
      reply,
      201
    );
  }
);

export const getStudents = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("Unauthorized access.", reply, 401);
    }

    const students = await getAllStudents();

    if (typeof students === "string") {
      return errorHandle(students, reply, 500);
    }

    return successHandle(
      {
        message: "Students retrieved successfully",
        students: students,
      },
      reply,
      200
    );
  }
);

export const getStudent = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("Unauthorized access.", reply, 401);
    }

    const { id } = request.params as { id: string };

    if (!id) {
      return errorHandle("Student ID is required.", reply, 400);
    }

    const student = await getStudentById(id);

    if (typeof student === "string") {
      return errorHandle(student, reply, 500);
    }

    if (!student) {
      return errorHandle("Student not found.", reply, 404);
    }

    return successHandle(
      {
        message: "Student retrieved successfully",
        student: student,
      },
      reply,
      200
    );
  }
);

export const updateStudentController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user || user.role !== "ADMIN") {
      return errorHandle("Only admins can update students.", reply, 403);
    }

    const { id } = request.params as { id: string };
    const data = request.body as {
      name?: string;
      dob?: string;
      phoneNumber?: string;
      whatsappNumber?: string;
      alternateNumber?: string;
      level?: Level;
      profileImageUrl?: string;
    };

    if (!id) {
      return errorHandle("Student ID is required.", reply, 400);
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.dob) updateData.dob = new Date(data.dob);
    if (data.phoneNumber !== undefined)
      updateData.phoneNumber = data.phoneNumber;
    if (data.whatsappNumber !== undefined)
      updateData.whatsappNumber = data.whatsappNumber;
    if (data.alternateNumber !== undefined)
      updateData.alternateNumber = data.alternateNumber;
    if (data.level) updateData.level = data.level;
    if (data.profileImageUrl !== undefined)
      updateData.profileImageUrl = data.profileImageUrl;

    const student = await updateStudent(id, updateData);

    if (typeof student === "string") {
      return errorHandle(student, reply, 500);
    }

    return successHandle(
      {
        message: "Student updated successfully",
        student: student,
      },
      reply,
      200
    );
  }
);

export const deleteStudentController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user || user.role !== "ADMIN") {
      return errorHandle("Only admins can delete students.", reply, 403);
    }

    const { id } = request.params as { id: string };

    if (!id) {
      return errorHandle("Student ID is required.", reply, 400);
    }

    const result = await deleteStudent(id);

    if (typeof result === "string") {
      return errorHandle(result, reply, 500);
    }

    return successHandle(
      {
        message: "Student deleted successfully",
      },
      reply,
      200
    );
  }
);

export const getStudentsByLevelController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("Unauthorized access.", reply, 401);
    }

    const { level } = request.params as { level: Level };

    if (!level) {
      return errorHandle("Level is required.", reply, 400);
    }

    const students = await getStudentsByLevel(level);

    if (typeof students === "string") {
      return errorHandle(students, reply, 500);
    }

    return successHandle(
      {
        message: "Students retrieved successfully",
        students: students,
      },
      reply,
      200
    );
  }
);
