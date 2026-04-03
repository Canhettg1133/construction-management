import { reportRepository } from "./report.repository";
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from "../../shared/errors";
import { isWithinDays, LIMITS } from "@construction/shared";
import { auditService } from "../audit/audit.service";
import { taskRepository } from "../tasks/task.repository";
import { notificationTriggers } from "../notifications/notification.triggers";
import { AuditEntityType } from "@prisma/client";

export const reportService = {
  async list(projectId: string, page: number, pageSize: number, from?: string, to?: string, createdBy?: string) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const [reports, total] = await Promise.all([
      reportRepository.findAll(projectId, page, pageSize, fromDate, toDate, createdBy),
      reportRepository.count(projectId, fromDate, toDate, createdBy),
    ]);
    return { reports, total };
  },

  async getById(id: string) {
    const report = await reportRepository.findById(id);
    if (!report) throw new NotFoundError("Không tìm thấy báo cáo");
    return report;
  },

  async create(data: {
    projectId: string;
    createdBy: string;
    reportDate: Date;
    weather: string;
    workerCount: number;
    workDescription: string;
    progress: number;
    temperatureMin?: number;
    temperatureMax?: number;
    issues?: string;
    notes?: string;
    isDraft?: boolean;
    tasks?: Array<{ title: string; description?: string; assignedTo?: string; priority?: string; dueDate?: Date }>;
  }) {
    const existing = await reportRepository.findByProjectAndDate(data.projectId, data.reportDate);
    if (existing) throw new ConflictError("Bao cao cho ngay nay da ton tai");

    const previousReport = await reportRepository.findLatestBeforeDate(data.projectId, data.reportDate);
    if (previousReport && data.progress < Number(previousReport.progress)) {
      throw new BadRequestError(
        `Tien do bao cao phai >= ${previousReport.progress}% (bao cao ngay ${previousReport.reportDate.toLocaleDateString("vi-VN")})`
      );
    }

    const nextReport = await reportRepository.findEarliestAfterDate(data.projectId, data.reportDate);
    if (nextReport && data.progress > Number(nextReport.progress)) {
      throw new BadRequestError(
        `Tien do bao cao phai <= ${nextReport.progress}% (bao cao ngay ${nextReport.reportDate.toLocaleDateString("vi-VN")})`
      );
    }

    const { tasks, isDraft, ...reportData } = data;
    const report = await reportRepository.create({
      ...reportData,
      status: isDraft ? "DRAFT" : "SENT",
    });

    if (!isDraft) {
      await auditService.log({
        userId: data.createdBy,
        action: "CREATE",
        entityType: AuditEntityType.DAILY_REPORT,
        entityId: report.id,
        description: `Đã tạo và gửi báo cáo ngày ${data.reportDate.toLocaleDateString("vi-VN")}`,
      });
    }

    if (tasks && tasks.length > 0) {
      for (const taskData of tasks) {
        await taskRepository.create({
          ...taskData,
          projectId: data.projectId,
          createdBy: data.createdBy,
          reportId: report.id,
        });
      }
    }

    return report;
  },

  async update(id: string, data: Record<string, unknown>, userId: string, userRole: string) {
    const report = await reportRepository.findById(id);
    if (!report) throw new NotFoundError("Không tìm thấy báo cáo");

    if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
      if (report.createdBy !== userId) {
        throw new ForbiddenError("Ban khong co quyen sua bao cao nay");
      }
      if (!isWithinDays(report.reportDate, LIMITS.REPORT_EDIT_DAYS)) {
        throw new ForbiddenError("Khong the sua bao cao da qua 7 ngay");
      }
    }

    if (typeof data.progress === "number") {
      const previousReport = await reportRepository.findLatestBeforeDate(report.projectId, report.reportDate, id);
      if (previousReport && data.progress < Number(previousReport.progress)) {
        throw new BadRequestError(
          `Tien do bao cao phai >= ${previousReport.progress}% (bao cao ngay ${previousReport.reportDate.toLocaleDateString("vi-VN")})`
        );
      }

      const nextReport = await reportRepository.findEarliestAfterDate(report.projectId, report.reportDate, id);
      if (nextReport && data.progress > Number(nextReport.progress)) {
        throw new BadRequestError(
          `Tien do bao cao phai <= ${nextReport.progress}% (bao cao ngay ${nextReport.reportDate.toLocaleDateString("vi-VN")})`
        );
      }
    }

    const updated = await reportRepository.update(id, data);

    await auditService.log({
      userId,
      action: "UPDATE",
      entityType: AuditEntityType.DAILY_REPORT,
      entityId: id,
      description: `Đã cập nhật báo cáo ngày ${updated.reportDate.toLocaleDateString("vi-VN")}`,
    });

    return updated;
  },

  async updateStatus(id: string, status: string, userId: string, userRole: string) {
    const report = await reportRepository.findById(id);
    if (!report) throw new NotFoundError("Không tìm thấy báo cáo");

    if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
      if (report.createdBy !== userId) {
        throw new ForbiddenError("Bạn không có quyền đổi trạng thái báo cáo này");
      }
    }

    const updated = await reportRepository.update(id, { status });

    await auditService.log({
      userId,
      action: "STATUS_CHANGE",
      entityType: AuditEntityType.DAILY_REPORT,
      entityId: id,
      description: `Đã đổi trạng thái báo cáo ngày ${updated.reportDate.toLocaleDateString("vi-VN")} sang ${status === "SENT" ? "Đã gửi" : "Nháp"}`,
    });

    return updated;
  },

  async submitForApproval(id: string, userId: string, userRole: string) {
    const report = await reportRepository.findById(id);
    if (!report) throw new NotFoundError("Không tìm thấy báo cáo");

    const canSubmit =
      userRole === "ADMIN" ||
      userRole === "PROJECT_MANAGER" ||
      userRole === "SITE_ENGINEER";

    if (!canSubmit) throw new ForbiddenError("Bạn không có quyền gửi duyệt báo cáo này");
    if (report.approvalStatus !== "PENDING") throw new ForbiddenError("Báo cáo đã được xử lý");

    const updated = await reportRepository.update(id, {
      submittedAt: new Date(),
      approvalStatus: "PENDING",
      status: "SENT",
    });

    await auditService.log({
      userId,
      action: "STATUS_CHANGE",
      entityType: AuditEntityType.DAILY_REPORT,
      entityId: id,
      description: `Đã gửi duyệt báo cáo ngày ${report.reportDate.toLocaleDateString("vi-VN")}`,
    });

    // Notify PMs of the project
    const pmIds = await reportRepository.getProjectPmIds(report.projectId);
    if (pmIds.length > 0) {
      await notificationTriggers.reportSubmitted({
        pmIds,
        reportId: report.id,
        reportDate: report.reportDate,
        projectId: report.projectId,
      });
    }

    return updated;
  },

  async delete(id: string, userId: string) {
    const report = await reportRepository.findById(id);
    if (!report) throw new NotFoundError("Không tìm thấy báo cáo");

    await reportRepository.delete(id);

    await auditService.log({
      userId,
      action: "DELETE",
      entityType: AuditEntityType.DAILY_REPORT,
      entityId: id,
      description: `Đã xóa báo cáo ngày ${report.reportDate.toLocaleDateString("vi-VN")}`,
    });
  },
};


