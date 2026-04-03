import type { Request, Response, NextFunction } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { AppError } from "../errors";

const loginLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
  blockDuration: 300,
});

const apiLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
});

export function loginRateLimit(req: Request, _res: Response, next: NextFunction) {
  const key = req.ip ?? "unknown";
  loginLimiter
    .consume(key)
    .then(() => next())
    .catch(() => {
      next(new AppError("Quá nhiều lần đăng nhập. Vui lòng thử lại sau 5 phút.", 429, "TOO_MANY_REQUESTS"));
    });
}

const AUTH_EXEMPT_PATHS = ["/auth/me", "/auth/refresh"];

export function apiRateLimit(req: Request, _res: Response, next: NextFunction) {
  // Exempt high-frequency auth endpoints to avoid 429 on page loads
  if (AUTH_EXEMPT_PATHS.some((p) => req.path.endsWith(p))) {
    return next();
  }

  const key = req.ip ?? "unknown";
  apiLimiter
    .consume(key)
    .then(() => next())
    .catch(() => {
      next(new AppError("Quá nhiều yêu cầu. Vui lòng thử lại sau.", 429, "TOO_MANY_REQUESTS"));
    });
}
