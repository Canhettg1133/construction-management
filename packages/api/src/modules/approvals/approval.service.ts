import { prisma } from "../../config/database";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../shared/errors/app-error";
import { auditService } from "../audit/audit.service";
import { notificationTriggers } from "../notifications/notification.triggers";
import { AuditEntityType } from "@prisma/client";

export const approvalService = {
  async listPending(userId: string, userRole: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;

    // PM/Admin: xem tất cả pending
    // Site Engineer: xem pending của dự án mình tham gia
    let reportWhere = {};
    let taskWhere = {};

    if (userRole !== "ADMIN") {
      const memberProjects = await prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      });
      const projectIds = memberProjects.map((m) => m.projectId);
      reportWhere = { projectId: { in: projectIds } };
      taskWhere = { projectId: { in: projectIds } };
    }

    const [reports, tasks, totalReports, totalTasks] = await Promise.all([
      prisma.dailyReport.findMany({
        where: { approvalStatus: "PENDING", ...reportWhere as object },
        include: { project: true, creator: true },
        orderBy: { submittedAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.task.findMany({
        where: { approvalStatus: "PENDING", ...taskWhere as object },
        include: { project: true, creator: true, assignee: true },
        orderBy: { submittedAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.dailyReport.count({ where: { approvalStatus: "PENDING", ...reportWhere as object } }),
      prisma.task.count({ where: { approvalStatus: "PENDING", ...taskWhere as object } }),
    ]);

    return { reports, tasks, totalReports, totalTasks };
  },

  async approveReport(reportId: string, userId: string, userRole: string) {
    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: { project: { include: { members: true } } },
    });
    if (!report) throw new NotFoundError("Không tìm thấy báo cáo");
    if (report.approvalStatus !== "PENDING") throw new BadRequestError("Báo cáo không ở trạng thái chờ duyệt");

    const isApprover = userRole === "ADMIN" || report.project.members.some(
      (m) => m.userId === userId && m.role === "PROJECT_MANAGER"
    );
    if (!isApprover) throw new ForbiddenError("Bạn không có quyền duyệt báo cáo này");

    const updated = await prisma.dailyReport.update({
      where: { id: reportId },
      data: {
        approvalStatus: "APPROVED",
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    const currentProjectProgress = Number(report.project.progress ?? 0);
    const approvedReportProgress = Number(report.progress ?? 0);
    const nextProjectProgress = Math.max(currentProjectProgress, approvedReportProgress);
    if (nextProjectProgress !== currentProjectProgress) {
      await prisma.project.update({
        where: { id: report.projectId },
        data: { progress: nextProjectProgress },
      });
    }

    await auditService.log({
      userId,
      action: "STATUS_CHANGE",
      entityType: AuditEntityType.DAILY_REPORT,
      entityId: reportId,
      description: `Đã duyệt báo cáo ngày ${report.reportDate.toLocaleDateString("vi-VN")}`,
    });

    // Notify creator
    await notificationTriggers.reportApproved({
      creatorId: report.createdBy,
      reportId: report.id,
      reportDate: report.reportDate,
      projectId: report.projectId,
    });

    return updated;
  },

  async rejectReport(reportId: string, userId: string, userRole: string, reason: string) {
    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: { project: { include: { members: true } } },
    });
    if (!report) throw new NotFoundError("Không tìm thấy báo cáo");
    if (report.approvalStatus !== "PENDING") throw new BadRequestError("Báo cáo không ở trạng thái chờ duyệt");

    const isApprover = userRole === "ADMIN" || report.project.members.some(
      (m) => m.userId === userId && m.role === "PROJECT_MANAGER"
    );
    if (!isApprover) throw new ForbiddenError("Bạn không có quyền duyệt báo cáo này");

    const updated = await prisma.dailyReport.update({
      where: { id: reportId },
      data: {
        approvalStatus: "REJECTED",
        approvedBy: userId,
        approvedAt: new Date(),
        rejectedReason: reason,
      },
    });

    await auditService.log({
      userId,
      action: "STATUS_CHANGE",
      entityType: AuditEntityType.DAILY_REPORT,
      entityId: reportId,
      description: `Đã từ chối báo cáo ngày ${report.reportDate.toLocaleDateString("vi-VN")}: ${reason}`,
    });

    await notificationTriggers.reportRejected({
      creatorId: report.createdBy,
      reportId: report.id,
      reportDate: report.reportDate,
      reason,
      projectId: report.projectId,
    });

    return updated;
  },

  async approveTask(taskId: string, userId: string, userRole: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: true } } },
    });
    if (!task) throw new NotFoundError("Không tìm thấy task");
    if (task.approvalStatus !== "PENDING") throw new BadRequestError("Task không ở trạng thái chờ duyệt");

    const isApprover = userRole === "ADMIN" || task.project.members.some(
      (m) => m.userId === userId && m.role === "PROJECT_MANAGER"
    );
    if (!isApprover) throw new ForbiddenError("Bạn không có quyền duyệt task này");

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        approvalStatus: "APPROVED",
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    await auditService.log({
      userId,
      action: "STATUS_CHANGE",
      entityType: AuditEntityType.TASK,
      entityId: taskId,
      description: `Đã duyệt task: ${task.title}`,
    });

    await notificationTriggers.taskApproved({
      creatorId: task.createdBy,
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.projectId,
    });

    return updated;
  },

  async rejectTask(taskId: string, userId: string, userRole: string, reason: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: true } } },
    });
    if (!task) throw new NotFoundError("Không tìm thấy task");
    if (task.approvalStatus !== "PENDING") throw new BadRequestError("Task không ở trạng thái chờ duyệt");

    const isApprover = userRole === "ADMIN" || task.project.members.some(
      (m) => m.userId === userId && m.role === "PROJECT_MANAGER"
    );
    if (!isApprover) throw new ForbiddenError("Bạn không có quyền duyệt task này");

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        approvalStatus: "REJECTED",
        approvedBy: userId,
        approvedAt: new Date(),
        rejectedReason: reason,
      },
    });

    await auditService.log({
      userId,
      action: "STATUS_CHANGE",
      entityType: AuditEntityType.TASK,
      entityId: taskId,
      description: `Đã từ chối task: ${task.title} — ${reason}`,
    });

    await notificationTriggers.taskRejected({
      creatorId: task.createdBy,
      taskId: task.id,
      taskTitle: task.title,
      reason,
      projectId: task.projectId,
    });

    return updated;
  },
};
