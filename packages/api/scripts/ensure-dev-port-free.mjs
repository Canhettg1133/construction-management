import { execFileSync } from "node:child_process";
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

const port = Number(process.env.PORT ?? 3001);

function run(command, args) {
  return execFileSync(command, args, {
    cwd: packageRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function getListeningPids() {
  if (process.platform === "win32") {
    let output = "";
    try {
      output = run("powershell", [
        "-NoProfile",
        "-Command",
        `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess`,
      ]);
    } catch {
      return [];
    }

    return output
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => Number(value))
      .filter(Number.isFinite);
  }

  try {
    const output = run("lsof", ["-ti", `tcp:${port}`]);
    return output
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => Number(value))
      .filter(Number.isFinite);
  } catch {
    return [];
  }
}

function getCommandLine(pid) {
  try {
    if (process.platform === "win32") {
      return run("powershell", [
        "-NoProfile",
        "-Command",
        `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}").CommandLine`,
      ]);
    }

    return run("ps", ["-p", String(pid), "-o", "command="]);
  } catch {
    return "";
  }
}

function killProcess(pid) {
  if (process.platform === "win32") {
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }

  execFileSync("kill", ["-TERM", String(pid)], { stdio: "ignore" });
}

const pids = [...new Set(getListeningPids())];

for (const pid of pids) {
  const commandLine = getCommandLine(pid);
  const isRepoApiProcess =
    commandLine.includes("src/server.ts") &&
    (commandLine.includes(workspaceRoot) ||
      commandLine.includes("tsx") ||
      commandLine.includes("loader.mjs"));

  if (!isRepoApiProcess) {
    console.error(`Port ${port} is already in use by PID ${pid}.`);
    console.error("Stop that process or change PORT in the root .env, then retry.");
    process.exit(1);
  }

  console.log(`Stopping stale API process on port ${port} (PID ${pid}).`);
  killProcess(pid);
}
