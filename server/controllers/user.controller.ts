import type { FastifyRequest, FastifyReply } from "fastify";
import { asyncHandle, successHandle, errorHandle } from "../utils/handler.js";
import { createUser, getUserByEmail } from "../service/user.service.js";
import type { User } from "../types/user.types.js";
import { generToken } from "../utils/generateToken.js";
import bcryptjs from "bcryptjs";

export const registerUser = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
  const data: Partial<User> = request.body as Partial<User>;

  if (!data.email || !data.password || !data.name) {
    return errorHandle("Email, password, and name are required.", reply, 400);
  }

  const [checkUser, hashedPassword] = await Promise.all([
    getUserByEmail(data.email),
    bcryptjs.hash(data.password, 10)
  ]);

  if (checkUser) {
    return errorHandle("User already exists with this email.", reply, 400);
  };

  const userData = {
    name: data.name,
    email: data.email,
    password: hashedPassword,
    role: data.role || "USER",
    phone: data.phone || "",
    qualification: data.qualification || "",
    address: data.address || ""
  };

  const user = await createUser(userData);

  if (typeof user === "string") {
    return errorHandle(user, reply, 500);
  }
  return successHandle({ message: "User registered successfully" }, reply, 201);
});

export const loginUser = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
  const data: Partial<User> = request.body as Partial<User>;

  if (!data.email || !data.password) {
    return errorHandle("Email and password are required.", reply, 400);
  }

  const user = await getUserByEmail(data.email);

  if (!user || typeof user === "string") {
    return errorHandle("User not found.", reply, 404);
  }

  const isPasswordValid = await bcryptjs.compare(data.password, user.password);

  if (!isPasswordValid) {
    return errorHandle("Invalid password.", reply, 401);
  }
  const token = generToken(user.id);
  return successHandle({
    message: "Login successful",
    token: token
  }, reply, 200);
});