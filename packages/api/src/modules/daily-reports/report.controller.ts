import type { Request, Response } from 'express'
import { reportService } from './report.service'
import { sendSuccess, sendNoContent, parsePagination, buildPaginationMeta } from '../../shared/utils'
import type { ProjectRole, SystemRole } from '@construction/shared'

function readActor(req: Request): {
  userId: string
  systemRole: SystemRole
  projectRole: ProjectRole | null
} {
  return {
    userId: req.user!.id,
    systemRole: req.user!.systemRole,
    projectRole: req.userPermissions?.projectRole ?? null,
  }
}

export const reportController = {
  async list(req: Request, res: Response) {
    const { page, pageSize } = parsePagination(req.query)
    const { reports, total } = await reportService.list(
      String(req.params.projectId),
      page,
      pageSize,
      req.query.from as string | undefined,
      req.query.to as string | undefined,
      req.query.created_by as string,
    )
    return sendSuccess(res, reports, buildPaginationMeta(total, page, pageSize))
  },

  async getById(req: Request, res: Response) {
    const report = await reportService.getById(String(req.params.reportId))
    return sendSuccess(res, report)
  },

  async create(req: Request, res: Response) {
    const isDraft = req.query._draft === '1'
    const report = await reportService.create({
      ...req.body,
      createdBy: req.user!.id,
      projectId: String(req.params.projectId),
      isDraft,
    })
    return sendSuccess(res, report)
  },

  async update(req: Request, res: Response) {
    const report = await reportService.update(String(req.params.reportId), req.body, readActor(req))
    return sendSuccess(res, report)
  },

  async updateStatus(req: Request, res: Response) {
    const report = await reportService.updateStatus(String(req.params.reportId), req.body.status, readActor(req))
    return sendSuccess(res, report)
  },

  async delete(req: Request, res: Response) {
    await reportService.delete(String(req.params.reportId), req.user!.id)
    return sendNoContent(res)
  },

  async submitForApproval(req: Request, res: Response) {
    const report = await reportService.submitForApproval(String(req.params.reportId), readActor(req))
    return sendSuccess(res, report)
  },

  async reopen(req: Request, res: Response) {
    const report = await reportService.reopen(String(req.params.reportId), readActor(req), req.body ?? {})
    return sendSuccess(res, report)
  },
}
