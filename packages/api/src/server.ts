import "dotenv/config";
import { createServer } from "http";
import app from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/database";
import { initSocket } from "./socket";
import { startCron, stopCron } from "./shared/services/cron.service";

async function start() {
  try {
    await prisma.$connect();
    logger.info("Database connected");

    const httpServer = createServer(app);
    initSocket(httpServer);
    startCron();

    httpServer.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error(error, "Failed to start server");
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
