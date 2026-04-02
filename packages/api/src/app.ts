import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { errorHandler } from "./shared/middleware";
import routes from "./routes";
import { NotFoundError } from "./shared/errors";

const app: Express = express();

app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger }));

app.use("/api/v1", routes);

app.use((_req, _res, next) => {
  next(new NotFoundError("API endpoint không tồn tại"));
});

app.use(errorHandler);

export default app;
