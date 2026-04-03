import { prisma } from "../../config/database";
import { Prisma } from "@prisma/client";
import type { ProjectRole, SystemRole } from "@construction/shared";
import { BadRequestError, NotFoundError } from "../../shared/errors";

interface BudgetActorContext {
  userId: string;
  systemRole: SystemRole;
  projectRole: ProjectRole | null;
}

function parseMoney(value: unknown, fieldName: string): Prisma.Decimal {
  let amount: Prisma.Decimal;
  try {
    amount = new Prisma.Decimal(String(value ?? "0"));
  } catch {
    throw new BadRequestError(`${fieldName} khong hop le`);
  }

  if (amount.lt(0)) {
    throw new BadRequestError(`${fieldName} phai >= 0`);
  }

  return amount;
}

function parsePositiveMoney(value: unknown, fieldName: string): Prisma.Decimal {
  const amount = parseMoney(value, fieldName);
  if (amount.lte(0)) {
    throw new BadRequestError(`${fieldName} phai > 0`);
  }
  return amount;
}

function parseRequiredText(value: unknown, fieldName: string, maxLength: number): string {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new BadRequestError(`${fieldName} khong duoc de trong`);
  }
  if (text.length > maxLength) {
    throw new BadRequestError(`${fieldName} vuot qua ${maxLength} ky tu`);
  }
  return text;
}

function parseOptionalText(value: unknown, fieldName: string, maxLength: number): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  if (text.length > maxLength) {
    throw new BadRequestError(`${fieldName} vuot qua ${maxLength} ky tu`);
  }
  return text;
}

function parseBudgetStatus(value: unknown): "PENDING" | "APPROVED" | "PAID" {
  const status = String(value ?? "PENDING").toUpperCase();
  if (status !== "PENDING" && status !== "APPROVED" && status !== "PAID") {
    throw new BadRequestError("Trang thai ngan sach khong hop le");
  }
  return status;
}

function parseDisbursementStatus(value: unknown): "APPROVED" | "PAID" {
  const status = String(value ?? "APPROVED").toUpperCase();
  if (status !== "APPROVED" && status !== "PAID") {
    throw new BadRequestError("Trang thai duyet giai ngan khong hop le");
  }
  return status;
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

async function ensureBudgetItemInProject(projectId: string, itemId: string) {
  const item = await prisma.budgetItem.findFirst({
    where: { id: itemId, projectId },
  });

  if (!item) {
    throw new NotFoundError("Khong tim thay hang muc ngan sach");
  }

  return item;
}

export const budgetService = {
  async getOverview(projectId: string) {
    await ensureProjectExists(projectId);

    const items = await prisma.budgetItem.findMany({
      where: { projectId },
      include: { disbursements: true },
    });

    const summary = items.reduce(
      (acc, item) => {
        const estimated = new Prisma.Decimal(item.estimatedCost);
        const approved = item.approvedCost ? new Prisma.Decimal(item.approvedCost) : estimated;
        const spent = new Prisma.Decimal(item.spentCost);

        acc.estimated = acc.estimated.plus(estimated);
        acc.approved = acc.approved.plus(approved);
        acc.spent = acc.spent.plus(spent);

        const pendingDisbursementAmount = item.disbursements
          .filter((disbursement) => disbursement.status === "PENDING")
          .reduce(
            (total, disbursement) => total.plus(new Prisma.Decimal(disbursement.amount)),
            new Prisma.Decimal(0)
          );
        acc.pendingDisbursement = acc.pendingDisbursement.plus(pendingDisbursementAmount);

        return acc;
      },
      {
        estimated: new Prisma.Decimal(0),
        approved: new Prisma.Decimal(0),
        spent: new Prisma.Decimal(0),
        pendingDisbursement: new Prisma.Decimal(0),
      }
    );

    const byCategoryMap = new Map<
      string,
      { estimated: Prisma.Decimal; approved: Prisma.Decimal; spent: Prisma.Decimal }
    >();

    for (const item of items) {
      const current = byCategoryMap.get(item.category) ?? {
        estimated: new Prisma.Decimal(0),
        approved: new Prisma.Decimal(0),
        spent: new Prisma.Decimal(0),
      };
      current.estimated = current.estimated.plus(new Prisma.Decimal(item.estimatedCost));
      current.approved = current.approved.plus(
        item.approvedCost ? new Prisma.Decimal(item.approvedCost) : new Prisma.Decimal(item.estimatedCost)
      );
      current.spent = current.spent.plus(new Prisma.Decimal(item.spentCost));
      byCategoryMap.set(item.category, current);
    }

    return {
      projectId,
      summary: {
        estimated: summary.estimated,
        approved: summary.approved,
        spent: summary.spent,
        remaining: summary.approved.minus(summary.spent),
        pendingDisbursement: summary.pendingDisbursement,
      },
      byCategory: Array.from(byCategoryMap.entries()).map(([category, values]) => ({
        category,
        estimated: values.estimated,
        approved: values.approved,
        spent: values.spent,
        remaining: values.approved.minus(values.spent),
      })),
      stats: {
        totalItems: items.length,
        pendingItems: items.filter((item) => item.status === "PENDING").length,
        approvedItems: items.filter((item) => item.status === "APPROVED").length,
        paidItems: items.filter((item) => item.status === "PAID").length,
      },
    };
  },

  async listItems(projectId: string) {
    await ensureProjectExists(projectId);

    const items = await prisma.budgetItem.findMany({
      where: { projectId },
      include: {
        disbursements: {
          orderBy: [{ createdAt: "desc" }],
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return {
      projectId,
      items,
    };
  },

  async createItem(projectId: string, _actor: BudgetActorContext, payload: Record<string, unknown>) {
    await ensureProjectExists(projectId);

    const category = parseRequiredText(payload.category, "Danh muc", 100);
    const description = parseRequiredText(payload.description, "Mo ta", 500);
    const estimatedCost = parsePositiveMoney(payload.estimatedCost, "Du toan");
    const approvedCost =
      payload.approvedCost !== undefined && payload.approvedCost !== null
        ? parsePositiveMoney(payload.approvedCost, "Muc phe duyet")
        : null;

    if (approvedCost && approvedCost.lt(estimatedCost)) {
      throw new BadRequestError("Muc phe duyet khong duoc nho hon du toan");
    }

    return prisma.budgetItem.create({
      data: {
        projectId,
        category,
        description,
        estimatedCost,
        approvedCost,
        status: approvedCost ? "APPROVED" : "PENDING",
      },
      include: {
        disbursements: true,
      },
    });
  },

  async updateItem(
    projectId: string,
    itemId: string,
    _actor: BudgetActorContext,
    payload: Record<string, unknown>
  ) {
    await ensureProjectExists(projectId);
    const currentItem = await ensureBudgetItemInProject(projectId, itemId);

    const data: {
      category?: string;
      description?: string;
      estimatedCost?: Prisma.Decimal;
      approvedCost?: Prisma.Decimal | null;
      status?: "PENDING" | "APPROVED" | "PAID";
    } = {};

    if (payload.category !== undefined) {
      data.category = parseRequiredText(payload.category, "Danh muc", 100);
    }

    if (payload.description !== undefined) {
      data.description = parseRequiredText(payload.description, "Mo ta", 500);
    }

    if (payload.estimatedCost !== undefined) {
      data.estimatedCost = parsePositiveMoney(payload.estimatedCost, "Du toan");
    }

    if (payload.approvedCost !== undefined) {
      if (payload.approvedCost === null || payload.approvedCost === "") {
        data.approvedCost = null;
      } else {
        data.approvedCost = parsePositiveMoney(payload.approvedCost, "Muc phe duyet");
      }
    }

    if (payload.status !== undefined) {
      data.status = parseBudgetStatus(payload.status);
    }

    const nextEstimatedCost = data.estimatedCost ?? new Prisma.Decimal(currentItem.estimatedCost);
    const nextApprovedCost =
      data.approvedCost !== undefined
        ? data.approvedCost
        : currentItem.approvedCost
          ? new Prisma.Decimal(currentItem.approvedCost)
          : null;

    if (nextApprovedCost && nextApprovedCost.lt(nextEstimatedCost)) {
      throw new BadRequestError("Muc phe duyet khong duoc nho hon du toan");
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError("Khong co truong nao de cap nhat");
    }

    return prisma.budgetItem.update({
      where: { id: itemId },
      data,
      include: {
        disbursements: {
          orderBy: [{ createdAt: "desc" }],
        },
      },
    });
  },

  async createDisbursement(
    projectId: string,
    _actor: BudgetActorContext,
    payload: Record<string, unknown>
  ) {
    await ensureProjectExists(projectId);

    const budgetItemId = parseRequiredText(payload.budgetItemId, "BudgetItemId", 64);
    const amount = parsePositiveMoney(payload.amount, "So tien giai ngan");
    const note = parseOptionalText(payload.note, "Ghi chu", 2000);

    const item = await ensureBudgetItemInProject(projectId, budgetItemId);
    const limit = item.approvedCost ? new Prisma.Decimal(item.approvedCost) : new Prisma.Decimal(item.estimatedCost);
    const spent = new Prisma.Decimal(item.spentCost);

    if (spent.plus(amount).gt(limit)) {
      throw new BadRequestError("So tien giai ngan vuot qua ngan sach duoc phe duyet");
    }

    return prisma.budgetDisbursement.create({
      data: {
        budgetItemId,
        amount,
        note,
        status: "PENDING",
      },
      include: {
        budgetItem: true,
      },
    });
  },

  async approveDisbursement(
    projectId: string,
    disbursementId: string,
    actor: BudgetActorContext,
    payload: Record<string, unknown>
  ) {
    await ensureProjectExists(projectId);

    const nextStatus = parseDisbursementStatus(payload.status);
    const note = parseOptionalText(payload.note, "Ghi chu", 2000);

    const disbursement = await prisma.budgetDisbursement.findFirst({
      where: {
        id: disbursementId,
        budgetItem: { projectId },
      },
      include: {
        budgetItem: true,
      },
    });

    if (!disbursement) {
      throw new NotFoundError("Khong tim thay phieu giai ngan");
    }

    if (disbursement.status !== "PENDING") {
      throw new BadRequestError("Phieu giai ngan da duoc xu ly truoc do");
    }

    const currentSpent = new Prisma.Decimal(disbursement.budgetItem.spentCost);
    const limit = disbursement.budgetItem.approvedCost
      ? new Prisma.Decimal(disbursement.budgetItem.approvedCost)
      : new Prisma.Decimal(disbursement.budgetItem.estimatedCost);

    if (currentSpent.plus(disbursement.amount).gt(limit)) {
      throw new BadRequestError("So tien giai ngan vuot qua ngan sach duoc phe duyet");
    }

    return prisma.$transaction(async (tx) => {
      const updatedDisbursement = await tx.budgetDisbursement.update({
        where: { id: disbursementId },
        data: {
          status: nextStatus,
          note: note ?? disbursement.note,
          approvedBy: actor.userId,
          approvedAt: new Date(),
        },
        include: {
          budgetItem: true,
        },
      });

      const updatedItem = await tx.budgetItem.update({
        where: { id: disbursement.budgetItemId },
        data: {
          spentCost: { increment: disbursement.amount },
          status: "APPROVED",
        },
      });

      const updatedSpent = new Prisma.Decimal(updatedItem.spentCost);
      const updatedLimit = updatedItem.approvedCost
        ? new Prisma.Decimal(updatedItem.approvedCost)
        : new Prisma.Decimal(updatedItem.estimatedCost);

      if (updatedSpent.gte(updatedLimit)) {
        await tx.budgetItem.update({
          where: { id: updatedItem.id },
          data: { status: "PAID" },
        });
      }

      return updatedDisbursement;
    });
  },
};
