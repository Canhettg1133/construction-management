import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { ValidationError } from "../errors";

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed && typeof parsed === "object") {
        const parsedRequest = parsed as { body?: unknown; query?: unknown; params?: unknown };
        if (parsedRequest.body !== undefined) {
          req.body = parsedRequest.body;
        }
        if (parsedRequest.query !== undefined) {
          req.query = parsedRequest.query as Request["query"];
        }
        if (parsedRequest.params !== undefined) {
          req.params = parsedRequest.params as Request["params"];
        }
      }

      next();
    } catch (error: unknown) {
      if (error && typeof error === "object" && "errors" in error) {
        const zodError = error as { errors: Array<{ path: string[]; message: string }> };
        const details = zodError.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        throw new ValidationError("Dữ liệu không hợp lệ", details);
      }
      throw error;
    }
  };
}
