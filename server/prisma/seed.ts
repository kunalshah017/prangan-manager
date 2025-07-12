import { PrismaClient } from "../generated/prisma/index.js";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const testPassword = "Prangan@2025";
  const hashedPassword = await bcryptjs.hash(testPassword, 10);

  // Create test admin user
  const testAdmin = await prisma.user.upsert({
    where: { email: "pranganfoundationindia@gmail.com" },
    update: {},
    create: {
      email: "pranganfoundationindia@gmail.com",
      name: "Prangan Admin",
      password: hashedPassword,
      role: "ADMIN",
      status: "APPROVED",
      phone: "+917718071289",
      qualification: "NA",
      address: "Prangan Foundation, India",
      dob: new Date("1990-01-15"),
    },
  });

  console.log("✅ Test admin user created successfully!");
  console.log("📧 Email: pranganfoundationindia@gmail.com");
  console.log("🔑 Password: Prangan@2025");
  console.log("👤 Role: ADMIN");
  console.log("✅ Status: APPROVED");
  console.log("🆔 User ID:", testAdmin.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
