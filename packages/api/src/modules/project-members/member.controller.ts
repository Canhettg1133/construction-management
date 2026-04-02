import type { Request, Response } from "express";
import { memberService } from "./member.service";
import { sendSuccess, sendNoContent } from "../../shared/utils";

export const memberController = {
  async list(req: Request, res: Response) {
    const members = await memberService.list(String(req.params.projectId));
    return sendSuccess(res, members);
  },

  async add(req: Request, res: Response) {
    const { userId, role } = req.body;
    const member = await memberService.add(String(req.params.projectId), userId, role, req.user!.id);
    return sendSuccess(res, member);
  },

  async updateRole(req: Request, res: Response) {
    const member = await memberService.updateRole(String(req.params.memberId), req.body.role, req.user!.id);
    return sendSuccess(res, member);
  },

  async remove(req: Request, res: Response) {
    await memberService.remove(String(req.params.memberId), req.user!.id);
    return sendNoContent(res);
  },
};
