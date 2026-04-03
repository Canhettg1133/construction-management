import type { Request, Response } from "express";
import { taskCommentService } from "./task-comment.service";
import { sendSuccess, sendNoContent } from "../../shared/utils";

export const taskCommentController = {
  async list(req: Request, res: Response) {
    const comments = await taskCommentService.list(String(req.params.taskId));
    return sendSuccess(res, comments);
  },

  async create(req: Request, res: Response) {
    const { content } = req.body;
    const comment = await taskCommentService.create(
      String(req.params.taskId),
      req.user!.id,
      content
    );
    return sendSuccess(res, comment);
  },

  async update(req: Request, res: Response) {
    const { content } = req.body;
    const comment = await taskCommentService.update(
      String(req.params.commentId),
      req.user!.id,
      content
    );
    return sendSuccess(res, comment);
  },

  async delete(req: Request, res: Response) {
    await taskCommentService.delete(
      String(req.params.commentId),
      req.user!.id
    );
    return sendNoContent(res);
  },
};
