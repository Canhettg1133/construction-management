import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const prismaDir = path.join(root, "packages", "api", "prisma");
const schemaPath = path.join(prismaDir, "schema.prisma");
const migrationDir = path.join(prismaDir, "migrations");

if (!fs.existsSync(schemaPath)) {
  console.error("Migration verification failed: missing prisma/schema.prisma");
  process.exit(1);
}

if (!fs.existsSync(migrationDir)) {
  console.error("Migration verification failed: missing prisma/migrations directory");
  process.exit(1);
}

const entries = fs.readdirSync(migrationDir, { withFileTypes: true });
const migrationFolders = entries.filter((e) => e.isDirectory());

if (migrationFolders.length === 0) {
  console.error("Migration verification failed: no migration folders found");
  process.exit(1);
}

const missingSql = migrationFolders.filter((folder) => {
  const sqlPath = path.join(migrationDir, folder.name, "migration.sql");
  return !fs.existsSync(sqlPath);
});

if (missingSql.length > 0) {
  console.error("Migration verification failed: migration.sql missing in:");
  for (const item of missingSql) {
    console.error(`- ${item.name}`);
  }
  process.exit(1);
}

console.log("Migration verification passed.");
