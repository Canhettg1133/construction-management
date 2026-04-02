import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targetDirs = [
  path.join(root, "packages", "api", "src", "modules", "projects"),
  path.join(root, "packages", "api", "src", "modules", "daily-reports"),
  path.join(root, "packages", "api", "src", "modules", "tasks"),
  path.join(root, "packages", "api", "src", "modules", "users"),
  path.join(root, "packages", "api", "src", "modules", "files"),
];

function readFilesRecursively(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...readFilesRecursively(fullPath));
    } else if (entry.isFile() && fullPath.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = targetDirs.flatMap(readFilesRecursively);
const serviceFiles = files.filter((f) => f.endsWith(".service.ts"));

const withoutAudit = serviceFiles.filter((file) => {
  const content = fs.readFileSync(file, "utf8");
  return !content.includes("auditService.log(");
});

if (withoutAudit.length > 0) {
  console.error("Audit verification failed. Service files missing auditService.log call:");
  for (const file of withoutAudit) {
    console.error(`- ${path.relative(root, file)}`);
  }
  process.exit(1);
}

console.log("Audit verification passed.");
