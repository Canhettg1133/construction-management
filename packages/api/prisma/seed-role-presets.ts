import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function hasColumn(tableName: string, columnName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*) as count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
      AND COLUMN_NAME = ${columnName}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function seedSystemRole(): Promise<void> {
  const hasSystemRole = await hasColumn("users", "system_role");
  if (!hasSystemRole) {
    console.log("Skip users.system_role seed: column does not exist.");
    return;
  }

  const hasLegacyRole = await hasColumn("users", "role");
  if (hasLegacyRole) {
    await prisma.$executeRaw`
      UPDATE users
      SET system_role = 'ADMIN'
      WHERE role = 'ADMIN'
    `;

    await prisma.$executeRaw`
      UPDATE users
      SET system_role = 'STAFF'
      WHERE role <> 'ADMIN'
    `;

    console.log("Seeded users.system_role from legacy users.role.");
    return;
  }

  console.log("Skip users.role mapping: legacy column already removed.");
}

async function seedProjectRole(): Promise<void> {
  const hasProjectMemberRole = await hasColumn("project_members", "role");
  if (!hasProjectMemberRole) {
    console.log("Skip project_members.role seed: column does not exist.");
    return;
  }

  await prisma.$executeRaw`
    UPDATE project_members
    SET role = 'ENGINEER'
    WHERE role = 'SITE_ENGINEER'
  `;

  console.log("Seeded project_members.role: SITE_ENGINEER -> ENGINEER.");
}

async function main(): Promise<void> {
  console.log("Start RBAC Phase 1 seed.");
  await seedSystemRole();
  await seedProjectRole();
  console.log("RBAC Phase 1 seed completed.");
}

main()
  .catch((error) => {
    console.error("RBAC Phase 1 seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
