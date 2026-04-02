import { prisma } from "../../config/database";

export const authRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email, deletedAt: null },
    });
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id, deletedAt: null },
    });
  },

  updateLastLogin(id: string) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  },

  createResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  },

  findResetToken(hash: string) {
    return prisma.passwordResetToken.findFirst({
      where: { tokenHash: hash, used: false, expiresAt: { gt: new Date() } },
    });
  },

  markResetTokenUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { used: true },
    });
  },

  updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  },
};
