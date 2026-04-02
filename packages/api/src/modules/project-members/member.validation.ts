import { z } from "zod";

export const addMemberSchema = z.object({
  body: z.object({
    userId: z.string().uuid("User ID không hợp lệ"),
    role: z.enum(["PROJECT_MANAGER", "SITE_ENGINEER", "VIEWER"]),
  }),
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(["PROJECT_MANAGER", "SITE_ENGINEER", "VIEWER"]),
  }),
});
