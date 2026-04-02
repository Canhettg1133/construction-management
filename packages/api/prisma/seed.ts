import { PrismaClient } from "@prisma/client";
import * as bcrypt from "@node-rs/bcrypt";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: "admin@construction.local" } });
  if (existing) {
    console.log("Admin user already exists, skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash("Admin@123", 12);

  await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@construction.local",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Seed completed: admin@construction.local / Admin@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
