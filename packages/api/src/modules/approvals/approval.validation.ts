import { z } from "zod";

export const rejectSchema = z.object({
  body: z.object({
    reason: z.string().min(1, "Lý do không được để trống").max(500),
  }),
});
