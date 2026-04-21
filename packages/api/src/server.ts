import { Prisma } from "@prisma/client";
import { createServer } from "http";
import app from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/database";
import { initSocket } from "./socket";
import { startCron, stopCron } from "./shared/services/cron.service";

function readDatabaseTarget() {
  try {
    const url = new URL(env.DATABASE_URL);
    const dbName = url.pathname.replace(/^\//, "") || "<unknown-db>";
    const port = url.port || "3306";
    return `${url.hostname}:${port}/${dbName}`;
  } catch {
    return "<invalid DATABASE_URL>";
  }
}

function logStartupFailure(error: unknown) {
  const databaseTarget = readDatabaseTarget();

  if (error instanceof Prisma.PrismaClientInitializationError) {
    if (error.errorCode === "P1001") {
      logger.error(
        {
          databaseTarget,
          nextSteps: [
            "Start MySQL and confirm the server is listening.",
            "Verify DATABASE_URL in the root .env uses the mysql:// protocol.",
            "Run `pnpm setup:dev` after the database is reachable.",
            "Until the API boots, the Vite proxy on http://localhost:5173 will return 500 for /api/*.",
          ],
        },
        "Database unreachable. API startup aborted."
      );
      return;
    }

    if (error.errorCode === "P1012") {
      logger.error(
        {
          databaseTarget,
          nextSteps: [
            "Fix DATABASE_URL in the root .env so it starts with mysql://.",
            "Re-run `pnpm dev:api` after updating the connection string.",
          ],
        },
        "Database configuration is invalid. API startup aborted."
      );
      return;
    }
  }

  if (typeof error === "object" && error !== null && "code" in error && error.code === "EADDRINUSE") {
    logger.error(
      {
        port: env.PORT,
        nextSteps: [
          "Stop the process already using this port, or change PORT in the root .env.",
          "Then re-run `pnpm dev:api`.",
        ],
      },
      "API port is already in use. Startup aborted."
    );
    return;
  }

  logger.error({ err: error, databaseTarget }, "Failed to start server");
}

async function start() {
  let httpServer: ReturnType<typeof createServer> | null = null;

  try {
    logger.info({ port: env.PORT, databaseTarget: readDatabaseTarget() }, "Starting API server");
    await prisma.$connect();
    logger.info("Database connected");

    httpServer = createServer(app);
    initSocket(httpServer);
    startCron();

    await new Promise<void>((resolve, reject) => {
      httpServer!.once("error", reject);
      httpServer!.listen(env.PORT, () => {
        logger.info(`Server running on port ${env.PORT}`);
        resolve();
      });
    });
  } catch (error) {
    stopCron();
    if (httpServer?.listening) {
      await new Promise((resolve) => httpServer!.close(() => resolve(undefined)));
    }
    logStartupFailure(error);
    process.exit(1);
  }
}

start();

process.on("SIGINT", async () => {
  stopCron();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  stopCron();
  await prisma.$disconnect();
  process.exit(0);
});
