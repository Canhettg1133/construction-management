import * as bcrypt from "@node-rs/bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { authRepository } from "./auth.repository";
import { mailService } from "../../shared/services/mail.service";
import { UnauthorizedError, ValidationError } from "../../shared/errors";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

export const authService = {
  async login(email: string, password: string) {
    const user = await authRepository.findByEmail(email.toLowerCase());

    if (!user) {
      throw new UnauthorizedError("Email hoặc mật khẩu không đúng");
    }

    if (!user.isActive) {
      throw new UnauthorizedError("Tài khoản đã bị khóa");
    }

    const validPassword = await bcrypt.verify(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError("Email hoặc mật khẩu không đúng");
    }

    await authRepository.updateLastLogin(user.id);

    const accessToken = this.generateAccessToken(user.id, user.email, user.systemRole);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        systemRole: user.systemRole,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
      },
      accessToken,
      refreshToken,
    };
  },

  async forgotPassword(email: string) {
    const user = await authRepository.findByEmail(email.toLowerCase());
    if (!user) {
      return; // Không báo lỗi để tránh leak email
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ

    await authRepository.createResetToken(user.id, tokenHash, expiresAt);

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;
    await mailService.sendPasswordReset(user.email, resetUrl);
  },

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const resetToken = await authRepository.findResetToken(tokenHash);

    if (!resetToken) {
      throw new ValidationError("Token không hợp lệ hoặc đã hết hạn");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await authRepository.updatePassword(resetToken.userId, passwordHash);
    await authRepository.markResetTokenUsed(resetToken.id);

    logger.info({ userId: resetToken.userId }, "Password reset completed");
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError();
    }

    const valid = await bcrypt.verify(currentPassword, user.passwordHash);
    if (!valid) {
      throw new ValidationError("Mật khẩu hiện tại không đúng");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await authRepository.updatePassword(userId, passwordHash);
  },

  generateAccessToken(userId: string, email: string, systemRole: string) {
    return jwt.sign({ id: userId, email, systemRole }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as string,
    } as jwt.SignOptions);
  },

  generateRefreshToken(userId: string) {
    return jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as string,
    } as jwt.SignOptions);
  },

  verifyRefreshToken(token: string) {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };
    } catch {
      throw new UnauthorizedError("Refresh token không hợp lệ");
    }
  },
};
