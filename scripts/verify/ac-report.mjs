import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiSrc = path.join(root, "packages", "api", "src");

function readFilesRecursively(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...readFilesRecursively(fullPath));
    else if (entry.isFile() && fullPath.endsWith(".test.ts")) files.push(fullPath);
  }
  return files;
}

const testFiles = readFilesRecursively(apiSrc);
const acIds = [
  "AC-1.2",
  "AC-2.1",
  "AC-6.2",
  "AC-7.2",
  "AC-9.1",
];

const content = testFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
const report = acIds.map((id) => ({ id, covered: content.includes(id) }));
const uncovered = report.filter((r) => !r.covered);

console.log("AC coverage report:");
for (const item of report) {
  console.log(`- ${item.id}: ${item.covered ? "covered" : "missing"}`);
}

if (uncovered.length > 0) {
  console.error("\nMissing AC coverage for:");
  for (const item of uncovered) {
    console.error(`- ${item.id}`);
  }
  process.exit(1);
}
