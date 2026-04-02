import { z } from "zod";

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    assignedTo: z.string().uuid().optional(),
    reportId: z.string().uuid().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
    dueDate: z.coerce.date().optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    assignedTo: z.string().uuid().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    dueDate: z.coerce.date().optional(),
  }),
});

export const updateTaskStatusSchema = z.object({
  body: z.object({
    status: z.enum(["TO_DO", "IN_PROGRESS", "DONE", "CANCELLED"]),
  }),
});

export const createCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Nội dung bình luận không được để trống").max(5000),
  }),
});

export const updateCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Nội dung bình luận không được để trống").max(5000),
  }),
});
