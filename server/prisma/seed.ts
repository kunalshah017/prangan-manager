import { PrismaClient } from "../generated/prisma/index.js";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const testPassword = "AdminTest123!";
  const hashedPassword = await bcryptjs.hash(testPassword, 10);

  // Create test admin user
  const testAdmin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      email: "admin@test.com",
      name: "Test Admin",
      password: hashedPassword,
      role: "ADMIN",
      status: "APPROVED",
      phone: "+1234567890",
      qualification: "Master of Computer Science",
      address: "123 Test Street, Test City, TC 12345",
      dob: new Date("1990-01-15"),
    },
  });

  console.log("✅ Test admin user created successfully!");
  console.log("📧 Email: admin@test.com");
  console.log("🔑 Password: AdminTest123!");
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
