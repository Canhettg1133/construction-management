import { prisma } from "../../config/database";
import { Prisma } from "@prisma/client";
import type { ProjectRole, SystemRole } from "@construction/shared";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../shared/errors";

interface WarehouseActorContext {
  userId: string;
  systemRole: SystemRole;
  projectRole: ProjectRole | null;
}

function parseQuantity(value: unknown): Prisma.Decimal {
  let quantity: Prisma.Decimal;
  try {
    quantity = new Prisma.Decimal(String(value ?? "0"));
  } catch {
    throw new BadRequestError("So luong khong hop le");
  }

  if (quantity.lte(0)) {
    throw new BadRequestError("So luong phai lon hon 0");
  }
  return quantity;
}

function parseNonEmpty(value: unknown, fieldName: string, maxLength = 2000): string {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new BadRequestError(`${fieldName} khong duoc de trong`);
  }
  if (text.length > maxLength) {
    throw new BadRequestError(`${fieldName} vuot qua ${maxLength} ky tu`);
  }
  return text;
}

function parseOptionalText(value: unknown, maxLength = 2000): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  if (text.length > maxLength) {
    throw new BadRequestError(`Ghi chu vuot qua ${maxLength} ky tu`);
  }
  return text;
}

function canManageStock(actor: WarehouseActorContext): boolean {
  return (
    actor.systemRole === "ADMIN" ||
    actor.projectRole === "PROJECT_MANAGER" ||
    actor.projectRole === "WAREHOUSE_KEEPER"
  );
}

function canApproveRequest(actor: WarehouseActorContext): boolean {
  return canManageStock(actor) || actor.projectRole === "QUALITY_MANAGER";
}

function isEngineerReadOnly(actor: WarehouseActorContext): boolean {
  return actor.systemRole !== "ADMIN" && actor.projectRole === "ENGINEER";
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

async function ensureInventoryInProject(projectId: string, inventoryId: string) {
  const inventory = await prisma.warehouseInventory.findFirst({
    where: { id: inventoryId, projectId },
    select: {
      id: true,
      projectId: true,
      quantity: true,
      materialName: true,
      unit: true,
      minQuantity: true,
      maxQuantity: true,
      location: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!inventory) {
    throw new NotFoundError("Khong tim thay vat tu trong kho du an");
  }

  return inventory;
}

export const warehouseService = {
  async getInventory(projectId: string, actor: WarehouseActorContext) {
    await ensureProjectExists(projectId);

    if (isEngineerReadOnly(actor)) {
      const lightweightInventory = await prisma.warehouseInventory.findMany({
        where: { projectId },
        select: {
          id: true,
          projectId: true,
          materialName: true,
          unit: true,
          location: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ materialName: "asc" }],
      });

      return {
        projectId,
        summary: {
          totalItems: lightweightInventory.length,
          lowStockItems: 0,
          totalQuantity: 0,
        },
        inventory: lightweightInventory,
        restricted: true,
        message: "Engineer chi xem danh muc vat tu de tao yeu cau",
      };
    }

    const inventory = await prisma.warehouseInventory.findMany({
      where: { projectId },
      orderBy: [{ materialName: "asc" }],
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    const summary = inventory.reduce(
      (acc, item) => {
        acc.totalItems += 1;
        acc.totalQuantity += Number(item.quantity);
        if (item.quantity.lte(item.minQuantity)) {
          acc.lowStockItems += 1;
        }
        return acc;
      },
      { totalItems: 0, lowStockItems: 0, totalQuantity: 0 }
    );

    return {
      projectId,
      summary,
      inventory,
    };
  },

  async getInventoryItem(projectId: string, inventoryId: string, actor: WarehouseActorContext) {
    await ensureProjectExists(projectId);

    if (isEngineerReadOnly(actor)) {
      throw new ForbiddenError("Engineer khong duoc xem chi tiet ton kho");
    }

    const inventory = await prisma.warehouseInventory.findFirst({
      where: { id: inventoryId, projectId },
      include: {
        transactions: {
          include: {
            requester: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: [{ createdAt: "desc" }],
          take: 50,
        },
      },
    });

    if (!inventory) {
      throw new NotFoundError("Khong tim thay vat tu trong kho du an");
    }

    return inventory;
  },

  async listTransactions(projectId: string, actor: WarehouseActorContext) {
    await ensureProjectExists(projectId);

    const where: Prisma.WarehouseTransactionWhereInput = {
      inventory: { projectId },
    };

    if (isEngineerReadOnly(actor)) {
      where.requestedBy = actor.userId;
    }

    const transactions = await prisma.warehouseTransaction.findMany({
      where,
      include: {
        inventory: {
          select: {
            id: true,
            materialName: true,
            unit: true,
            location: true,
          },
        },
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });

    const summary = transactions.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === "PENDING") acc.pending += 1;
        if (item.type === "REQUEST") acc.requests += 1;
        return acc;
      },
      { total: 0, pending: 0, requests: 0 }
    );

    return {
      projectId,
      summary,
      transactions,
    };
  },

  async createTransaction(projectId: string, actor: WarehouseActorContext, payload: Record<string, unknown>) {
    await ensureProjectExists(projectId);

    if (!canManageStock(actor)) {
      throw new ForbiddenError("Chi PM hoac thu kho moi duoc nhap/xuat vat tu");
    }

    const inventoryId = parseNonEmpty(payload.inventoryId, "InventoryId", 64);
    const type = String(payload.type ?? "").toUpperCase();
    if (type !== "IN" && type !== "OUT") {
      throw new BadRequestError("Loai giao dich phai la IN hoac OUT");
    }

    const quantity = parseQuantity(payload.quantity);
    const note = parseOptionalText(payload.note);
    const inventory = await ensureInventoryInProject(projectId, inventoryId);

    return prisma.$transaction(async (tx) => {
      const currentQuantity = new Prisma.Decimal(inventory.quantity);

      if (type === "OUT" && currentQuantity.lt(quantity)) {
        throw new BadRequestError(
          `Ton kho khong du de xuat (${currentQuantity.toString()} ${inventory.unit})`
        );
      }

      const nextQuantity = type === "IN" ? currentQuantity.plus(quantity) : currentQuantity.minus(quantity);

      const transaction = await tx.warehouseTransaction.create({
        data: {
          inventoryId,
          type,
          quantity,
          note,
          requestedBy: actor.userId,
          approvedBy: actor.userId,
          status: "APPROVED",
        },
      });

      await tx.warehouseInventory.update({
        where: { id: inventoryId },
        data: { quantity: nextQuantity },
      });

      return transaction;
    });
  },

  async createRequest(projectId: string, actor: WarehouseActorContext, payload: Record<string, unknown>) {
    await ensureProjectExists(projectId);

    const inventoryId = parseNonEmpty(payload.inventoryId, "InventoryId", 64);
    const quantity = parseQuantity(payload.quantity);
    const note = parseOptionalText(payload.note);

    await ensureInventoryInProject(projectId, inventoryId);

    return prisma.warehouseTransaction.create({
      data: {
        inventoryId,
        type: "REQUEST",
        quantity,
        note,
        requestedBy: actor.userId,
        status: "PENDING",
      },
      include: {
        inventory: {
          select: { id: true, materialName: true, unit: true, location: true },
        },
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async updateRequest(
    projectId: string,
    requestId: string,
    actor: WarehouseActorContext,
    payload: Record<string, unknown>
  ) {
    await ensureProjectExists(projectId);

    if (!canApproveRequest(actor)) {
      throw new ForbiddenError("Ban khong co quyen duyet yeu cau vat tu");
    }

    const nextStatus = String(payload.status ?? "").toUpperCase();
    if (nextStatus !== "APPROVED" && nextStatus !== "REJECTED") {
      throw new BadRequestError("Trang thai phai la APPROVED hoac REJECTED");
    }

    const note = parseOptionalText(payload.note);

    const request = await prisma.warehouseTransaction.findFirst({
      where: {
        id: requestId,
        inventory: { projectId },
      },
      include: {
        inventory: {
          select: { id: true, quantity: true, unit: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundError("Khong tim thay yeu cau vat tu");
    }

    if (request.type !== "REQUEST") {
      throw new BadRequestError("Chi duoc cap nhat giao dich REQUEST");
    }

    if (request.status !== "PENDING") {
      throw new BadRequestError("Yeu cau da duoc xu ly truoc do");
    }

    return prisma.$transaction(async (tx) => {
      if (nextStatus === "APPROVED") {
        const currentQuantity = new Prisma.Decimal(request.inventory.quantity);
        if (currentQuantity.lt(request.quantity)) {
          throw new BadRequestError(
            `Ton kho khong du de duyet (${currentQuantity.toString()} ${request.inventory.unit})`
          );
        }

        await tx.warehouseInventory.update({
          where: { id: request.inventoryId },
          data: {
            quantity: currentQuantity.minus(request.quantity),
          },
        });
      }

      return tx.warehouseTransaction.update({
        where: { id: requestId },
        data: {
          status: nextStatus,
          approvedBy: actor.userId,
          note: note ?? request.note,
        },
        include: {
          inventory: {
            select: { id: true, materialName: true, unit: true, location: true },
          },
          requester: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    });
  },
};
