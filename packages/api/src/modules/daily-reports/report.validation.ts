import { z } from "zod";

export const createReportSchema = z.object({
  body: z.object({
    reportDate: z.coerce.date(),
    weather: z.enum(["SUNNY", "RAINY", "CLOUDY", "OTHER"]),
    temperatureMin: z.number().int().optional(),
    temperatureMax: z.number().int().optional(),
    workerCount: z.number().int().min(0),
    workDescription: z.string().min(1).max(5000),
    issues: z.string().max(5000).optional(),
    progress: z.number().min(0).max(100),
    notes: z.string().max(5000).optional(),
    tasks: z
      .array(
        z.object({
          title: z.string().min(1).max(200),
          description: z.string().max(1000).optional(),
          assignedTo: z.string().uuid().optional(),
          priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
          dueDate: z.coerce.date().optional(),
        })
      )
      .optional(),
  }).refine(
    (data) => data.temperatureMin === undefined || data.temperatureMax === undefined || data.temperatureMin <= data.temperatureMax,
    { message: "Nhiệt độ thấp nhất phải <= nhiệt độ cao nhất", path: ["temperatureMax"] }
  ),
});

export const updateReportSchema = z.object({
  body: z
    .object({
      weather: z.enum(["SUNNY", "RAINY", "CLOUDY", "OTHER"]).optional(),
      temperatureMin: z.number().int().optional(),
      temperatureMax: z.number().int().optional(),
      workerCount: z.number().int().min(0).optional(),
      workDescription: z.string().min(1).max(5000).optional(),
      issues: z.string().max(5000).optional(),
      progress: z.number().min(0).max(100).optional(),
      notes: z.string().max(5000).optional(),
    })
    .refine(
      (data) => data.temperatureMin === undefined || data.temperatureMax === undefined || data.temperatureMin <= data.temperatureMax,
      { message: "Nhiệt độ thấp nhất phải <= nhiệt độ cao nhất", path: ["temperatureMax"] }
    ),
});

export const updateReportStatusSchema = z.object({
  body: z.object({
    status: z.enum(["DRAFT", "SENT"]),
  }),
});
