import { PrismaClient, Role, UserStatus } from "../generated/prisma/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: "pranganfoundationindia@gmail.com",
    },
  });

  if (existingAdmin) {
    console.log("👤 Admin user already exists, skipping creation");
    return;
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash("Prangan@2025", 10);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: "pranganfoundationindia@gmail.com",
      name: "Prangan Foundation Admin",
      password: hashedPassword,
      role: Role.ADMIN,
      status: UserStatus.APPROVED,
      phone: null,
      dob: null,
      qualification: null,
      address: null,
      profileImageUrl: null,
    },
  });

  console.log("✅ Admin user created successfully:");
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Name: ${adminUser.name}`);
  console.log(`   Role: ${adminUser.role}`);
  console.log(`   Status: ${adminUser.status}`);
  console.log(`   ID: ${adminUser.id}`);

  console.log("🎉 Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
