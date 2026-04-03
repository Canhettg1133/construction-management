import { z } from "zod";

const PROJECT_ROLE_VALUES = [
  "PROJECT_MANAGER",
  "ENGINEER",
  "SAFETY_OFFICER",
  "DESIGN_ENGINEER",
  "QUALITY_MANAGER",
  "WAREHOUSE_KEEPER",
  "CLIENT",
  "VIEWER",
] as const;

export const addMemberSchema = z.object({
  body: z.object({
    userId: z.string().uuid("User ID không hợp lệ"),
    role: z.enum(PROJECT_ROLE_VALUES),
  }),
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(PROJECT_ROLE_VALUES),
  }),
});
