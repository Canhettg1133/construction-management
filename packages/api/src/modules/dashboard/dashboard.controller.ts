import type { Request, Response } from "express";
import { dashboardService } from "./dashboard.service";
import { sendSuccess } from "../../shared/utils";

export const dashboardController = {
  async getStats(_req: Request, res: Response) {
    const data = await dashboardService.getStats();
    return sendSuccess(res, data);
  },
};
