import { prisma } from "../../config/database";
import { Prisma } from "@prisma/client";
import type { ProjectRole, SystemRole } from "@construction/shared";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../shared/errors";

interface SafetyActorContext {
  userId: string;
  systemRole: SystemRole;
  projectRole: ProjectRole | null;
}

function parseReportDate(value: unknown): Date {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError("Ngay bao cao khong hop le");
  }
  return date;
}

function parseTextField(value: unknown, fieldName: string, maxLength: number): string {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new BadRequestError(`${fieldName} khong duoc de trong`);
  }
  if (text.length > maxLength) {
    throw new BadRequestError(`${fieldName} vuot qua ${maxLength} ky tu`);
  }
  return text;
}

function parseViolations(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BadRequestError("So vi pham khong hop le");
  }
  return parsed;
}

function parsePhotos(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new BadRequestError("Danh sach anh khong hop le");
  }

  const photos = value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);

  if (photos.some((item) => item.length > 1000)) {
    throw new BadRequestError("Duong dan anh vuot qua gioi han");
  }

  return photos;
}

async function ensureProjectExists(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });

  if (!project) {
    throw new NotFoundError("Khong tim thay du an");
  }

  return project;
}

async function ensureInspector(projectId: string, inspectorId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: inspectorId } },
    select: { userId: true },
  });

  if (!member) {
    throw new BadRequestError("Nguoi lap bao cao khong thuoc du an");
  }
}

function canManageAnyReport(actor: SafetyActorContext): boolean {
  return actor.systemRole === "ADMIN" || actor.projectRole === "PROJECT_MANAGER";
}

export const safetyService = {
  async listReports(projectId: string) {
    await ensureProjectExists(projectId);

    const reports = await prisma.safetyReport.findMany({
      where: { projectId },
      include: {
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
    });

    const summary = reports.reduce(
      (acc, report) => {
        acc.total += 1;
        acc.violations += report.violations;
        if (report.status === "PENDING") acc.pending += 1;
        if (report.status === "APPROVED") acc.approved += 1;
        if (report.status === "REJECTED") acc.rejected += 1;
        return acc;
      },
      {
        total: 0,
        violations: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      }
    );

    return {
      projectId,
      summary,
      reports,
    };
  },

  async getReport(projectId: string, reportId: string) {
    await ensureProjectExists(projectId);

    const report = await prisma.safetyReport.findFirst({
      where: { id: reportId, projectId },
      include: {
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!report) {
      throw new NotFoundError("Khong tim thay bao cao an toan");
    }

    return report;
  },

  async createReport(projectId: string, actor: SafetyActorContext, payload: Record<string, unknown>) {
    await ensureProjectExists(projectId);

    const reportDate = parseReportDate(payload.reportDate);
    const location = parseTextField(payload.location, "Vi tri", 500);
    const description = parseTextField(payload.description, "Noi dung", 20000);
    const violations = parseViolations(payload.violations);
    const photos = payload.photos !== undefined ? parsePhotos(payload.photos) : undefined;
    const inspectorId = String(payload.inspectorId ?? actor.userId);

    if (!canManageAnyReport(actor) && inspectorId !== actor.userId) {
      throw new ForbiddenError("Ban chi duoc tao bao cao an toan cua chinh minh");
    }

    await ensureInspector(projectId, inspectorId);

    return prisma.safetyReport.create({
      data: {
        projectId,
        reportDate,
        inspectorId,
        location,
        description,
        violations,
        photos,
      },
      include: {
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async updateReport(
    projectId: string,
    reportId: string,
    actor: SafetyActorContext,
    payload: Record<string, unknown>
  ) {
    await ensureProjectExists(projectId);

    const report = await prisma.safetyReport.findFirst({
      where: { id: reportId, projectId },
      select: {
        id: true,
        projectId: true,
        inspectorId: true,
        status: true,
      },
    });

    if (!report) {
      throw new NotFoundError("Khong tim thay bao cao an toan");
    }

    const isOwner = report.inspectorId === actor.userId;
    if (!isOwner && !canManageAnyReport(actor)) {
      throw new ForbiddenError("Ban chi duoc sua bao cao an toan cua minh");
    }

    if (report.status !== "PENDING") {
      throw new BadRequestError("Bao cao da ky duyet, khong the chinh sua");
    }

    const data: Prisma.SafetyReportUpdateInput = {};

    if (payload.reportDate !== undefined) {
      data.reportDate = parseReportDate(payload.reportDate);
    }

    if (payload.location !== undefined) {
      data.location = parseTextField(payload.location, "Vi tri", 500);
    }

    if (payload.description !== undefined) {
      data.description = parseTextField(payload.description, "Noi dung", 20000);
    }

    if (payload.violations !== undefined) {
      data.violations = parseViolations(payload.violations);
    }

    if (payload.photos !== undefined) {
      data.photos = payload.photos === null ? Prisma.JsonNull : parsePhotos(payload.photos);
    }

    if (payload.inspectorId !== undefined) {
      if (!canManageAnyReport(actor)) {
        throw new ForbiddenError("Ban khong duoc doi nguoi lap bao cao");
      }

      const nextInspectorId = String(payload.inspectorId ?? "").trim();
      if (!nextInspectorId) {
        throw new BadRequestError("InspectorId khong hop le");
      }
      await ensureInspector(projectId, nextInspectorId);
      data.inspector = { connect: { id: nextInspectorId } };
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError("Khong co truong nao de cap nhat");
    }

    return prisma.safetyReport.update({
      where: { id: reportId },
      data,
      include: {
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async signReport(projectId: string, reportId: string, actor: SafetyActorContext) {
    await ensureProjectExists(projectId);

    const report = await prisma.safetyReport.findFirst({
      where: { id: reportId, projectId },
      select: { id: true, status: true },
    });

    if (!report) {
      throw new NotFoundError("Khong tim thay bao cao an toan");
    }

    if (report.status !== "PENDING") {
      throw new BadRequestError("Bao cao da duoc ky duyet truoc do");
    }

    return prisma.safetyReport.update({
      where: { id: reportId },
      data: {
        status: "APPROVED",
        signedBy: actor.userId,
        signedAt: new Date(),
      },
      include: {
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },
};
