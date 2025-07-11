import { Role } from "../generated/prisma/index.js";

export interface User {
    name: string;
    email: string;
    password: string;
    role: Role;
    phone: string;
    qualification: string;
    address: string;
}