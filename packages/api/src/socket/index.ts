import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { logger } from "../config/logger";
import type { SystemRole } from "@construction/shared";

interface JwtPayload {
  id: string;
  email: string;
  systemRole: SystemRole;
}

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use((socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      logger.warn({ socketId: socket.id }, "Socket connection rejected: no token");
      return next(new Error("Chưa đăng nhập"));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      (socket.data as { userId: string }).userId = decoded.id;
      next();
    } catch {
      logger.warn({ socketId: socket.id }, "Socket connection rejected: invalid token");
      next(new Error("Token không hợp lệ"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket.data as { userId: string }).userId;
    socket.join(`user:${userId}`);
    logger.info({ userId, socketId: socket.id }, "User connected via WebSocket");

    socket.on("disconnect", () => {
      logger.info({ userId, socketId: socket.id }, "User disconnected from WebSocket");
    });
  });

  logger.info("Socket.IO initialized");
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO chưa được khởi tạo. Gọi initSocket trước.");
  }
  return io;
}
