import {
  UserStatus,
  type Role,
  type UserStatus as UserStatusValue,
} from "../generated/prisma/index.js";

type AuthenticationUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatusValue;
};

export const toAuthenticatedIdentity = (user: AuthenticationUser) => {
  if (user.status !== UserStatus.APPROVED) return null;

  const { id, name, email, role } = user;
  return { id, name, email, role };
};
