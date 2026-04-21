import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const currentFile = fileURLToPath(import.meta.url);
const scriptsDir = dirname(currentFile);
const packageRoot = resolve(scriptsDir, "..");
const workspaceRoot = resolve(packageRoot, "../..");

for (const envPath of [resolve(packageRoot, ".env"), resolve(workspaceRoot, ".env")]) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: true });
  }
}

const [, , command, ...args] = process.argv;

if (!command) {
  console.error("Missing command");
  process.exit(1);
}

const child = spawn(command, args, {
  cwd: packageRoot,
  env: process.env,
  shell: true,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
