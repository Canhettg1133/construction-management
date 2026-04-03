import { z } from "zod";

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().toLowerCase(),
    password: z
      .string()
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
      .regex(/[A-Z]/, "Phải có ít nhất 1 chữ hoa")
      .regex(/[a-z]/, "Phải có ít nhất 1 chữ thường")
      .regex(/[0-9]/, "Phải có ít nhất 1 số"),
    systemRole: z.enum(["ADMIN", "STAFF"]),
    phone: z.string().max(20).optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    systemRole: z.enum(["ADMIN", "STAFF"]).optional(),
    phone: z.string().max(20).optional(),
  }),
});

export const toggleStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
});
