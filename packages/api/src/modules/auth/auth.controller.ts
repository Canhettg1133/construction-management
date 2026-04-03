import type { Request, Response } from "express";
import { authService } from "./auth.service";
import { authRepository } from "./auth.repository";
import { UnauthorizedError } from "../../shared/errors";
import { sendSuccess } from "../../shared/utils";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

const isProd = env.NODE_ENV === "production";

export const authController = {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.cookie("access_token", result.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      path: "/api/v1/auth/refresh",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    logger.info({ userId: result.user.id }, "User logged in");
    return sendSuccess(res, { user: result.user });
  },

  async logout(_req: Request, res: Response) {
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/v1/auth/refresh" });
    return sendSuccess(res, null);
  },

  async refresh(req: Request, res: Response) {
    const token = req.cookies?.refresh_token;
    if (!token) {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Chưa đăng nhập" } });
    }

    const decoded = authService.verifyRefreshToken(token);

    // Generate a new access token with minimal claims (ID + role)
    // The refresh endpoint intentionally does NOT re-fetch user from DB for performance
    const newAccessToken = authService.generateAccessToken(
      decoded.id,
      "", // role will be re-fetched from /me endpoint
      ""
    );

    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return sendSuccess(res, null);
  },

  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(req.body.email);
    return sendSuccess(res, null);
  },

  async resetPassword(req: Request, res: Response) {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    return sendSuccess(res, null);
  },

  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    return sendSuccess(res, null);
  },

  async me(req: Request, res: Response) {
    const user = await authRepository.findById(req.user!.id);
    if (!user || user.deletedAt) {
      throw new UnauthorizedError("Không tìm thấy người dùng");
    }
    return sendSuccess(res, {
      id: user.id,
      name: user.name ?? "",
      email: user.email,
      role: user.role,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  },
};
