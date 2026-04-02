import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const filesToCheck = [
  path.join(root, "packages", "api", "src", "app.ts"),
  path.join(root, "packages", "api", "src", "shared", "middleware", "auth.middleware.ts"),
  path.join(root, "packages", "api", "src", "shared", "middleware", "validate.middleware.ts"),
  path.join(root, "packages", "api", "src", "modules", "files", "file.routes.ts"),
];

const requiredSnippets = [
  { file: "app.ts", pattern: "helmet()" },
  { file: "app.ts", pattern: "cors(" },
  { file: "auth.middleware.ts", pattern: "throw new UnauthorizedError" },
  { file: "validate.middleware.ts", pattern: "schema.parse" },
  { file: "file.routes.ts", pattern: "authenticate" },
];

const missing = [];

for (const check of requiredSnippets) {
  const target = filesToCheck.find((f) => f.endsWith(check.file));
  if (!target || !fs.existsSync(target)) {
    missing.push(`${check.file}: missing file`);
    continue;
  }

  const content = fs.readFileSync(target, "utf8");
  if (!content.includes(check.pattern)) {
    missing.push(`${check.file}: missing pattern ${check.pattern}`);
  }
}

if (missing.length > 0) {
  console.error("Security verification failed:\n" + missing.map((m) => `- ${m}`).join("\n"));
  process.exit(1);
}

console.log("Security verification passed.");
