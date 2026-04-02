import { z } from "zod";

export const createProjectSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(50).regex(/^[a-zA-Z0-9-]+$/, "Mã dự án chỉ chứa chữ, số và dấu gạch ngang"),
    name: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    location: z.string().min(1).max(500),
    clientName: z.string().max(200).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED"]).optional(),
  }).refine(
    (data) => !data.endDate || data.endDate >= data.startDate,
    { message: "Ngày kết thúc phải sau ngày bắt đầu", path: ["endDate"] }
  ),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    location: z.string().min(1).max(500).optional(),
    clientName: z.string().max(200).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED"]).optional(),
    progress: z.number().min(0).max(100).optional(),
  }).refine(
    (data) => !data.endDate || !data.startDate || data.endDate >= data.startDate,
    { message: "Ngày kết thúc phải sau ngày bắt đầu", path: ["endDate"] }
  ),
});
